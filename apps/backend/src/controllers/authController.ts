import User from '@/models/user';
import { responseHelper, simplifyTryCatch } from '@/utils/common';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import {
  generateAccessToken,
  generateRefreshToken,
  setAccessCookie,
  setRefreshCookie,
  clearAuthCookie,
} from '@/utils/auth';
import sequelize from '@/utils/postgres';
import personnelNotificationServices from '@/services/personnelNotificationServices';
import emailService from '@/services/emailService';

const comparePassword = async (password: string, dbPassword: string) => {
  const compareResult = await bcrypt.compare(password, dbPassword);
  return compareResult;
};

const login = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(responseHelper(false, null, '該用戶尚未註冊', null));
    }

    // FR-1: 禁止透過一般登入形式登入 Guest 帳號
    if (user.isGuest) {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json(
          responseHelper(
            false,
            null,
            '此為訪客帳號，無法透過一般方式登入',
            null,
          ),
        );
    }

    const compareResult = await comparePassword(password, user.password);
    if (!compareResult) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(responseHelper(false, null, '帳號或密碼錯誤', null));
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      isGuest: false,
    };

    const accessToken = await generateAccessToken(tokenPayload);
    const refreshToken = await generateRefreshToken(tokenPayload);

    if (!accessToken) {
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json(
          responseHelper(false, null, 'Generate Access Token failed', null),
        );
    }
    setAccessCookie(res, accessToken);

    if (!refreshToken) {
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json(
          responseHelper(false, null, 'Generate Refresh Token failed', null),
        );
    }
    setRefreshCookie(res, refreshToken);

    const userInfo = {
      name: user.name,
      email: user.email,
      isGuest: false,
    };

    return res
      .status(StatusCodes.OK)
      .json(responseHelper(true, userInfo, '登入成功', null));
  });
};

const logout = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    await clearAuthCookie(req, res);
    return res
      .status(StatusCodes.OK)
      .json(responseHelper(true, null, '登出成功', null));
  });
};

/**
 * POST /api/auth/guest-login
 * 建立訪客帳號並自動登入
 */
const guestLogin = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const guestId = uuidv4();
    const guestEmail = `guest_${guestId}@easyaccounting.demo`;
    const randomPassword = await bcrypt.hash(uuidv4(), 12);

    const user = await User.create({
      name: 'Guest',
      email: guestEmail,
      password: randomPassword,
      isGuest: true,
      lastActivityAt: new Date(),
    } as any);

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      isGuest: true,
    };

    const accessToken = await generateAccessToken(tokenPayload);
    const refreshToken = await generateRefreshToken(tokenPayload);

    setAccessCookie(res, accessToken);
    setRefreshCookie(res, refreshToken);

    const userInfo = {
      name: user.name,
      email: user.email,
      isGuest: true,
    };

    return res
      .status(StatusCodes.CREATED)
      .json(responseHelper(true, userInfo, '訪客登入成功', null));
  });
};

/**
 * POST /api/auth/promote
 * 將訪客帳號轉正為正式帳號
 * Body: { name, email, password }
 */
const promote = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const userId = req.user?.userId;
    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(responseHelper(false, null, 'Unauthorized', null));
    }

    const { name, email, password } = req.body;

    // DB Transaction + SELECT FOR UPDATE 確保原子性
    const result = await sequelize.transaction(async (t) => {
      const user = await User.findByPk(userId, {
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (!user) {
        return { status: StatusCodes.NOT_FOUND, message: '使用者不存在' };
      }

      if (!user.isGuest) {
        return {
          status: StatusCodes.BAD_REQUEST,
          message: '此帳號已為正式帳號',
        };
      }

      // 檢查 email 是否已被使用
      const existingUser = await User.findOne({
        where: { email },
        transaction: t,
      });

      if (existingUser) {
        return {
          status: StatusCodes.CONFLICT,
          message:
            '此 Email 已被使用，請更換 Email，或選擇登入此帳號（目前的試用資料將被清空）',
        };
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      await user.update(
        {
          name,
          email,
          password: hashedPassword,
          isGuest: false,
        },
        { transaction: t },
      );

      return { status: StatusCodes.OK, user } as const;
    });

    if (result.status !== StatusCodes.OK || !('user' in result)) {
      return res
        .status(result.status)
        .json(responseHelper(false, null, (result as any).message, null));
    }

    const promotedUser = result.user!;

    // 重新簽發 Token
    const tokenPayload = {
      userId: promotedUser.id,
      email: promotedUser.email,
      isGuest: false,
    };

    const accessToken = await generateAccessToken(tokenPayload);
    const refreshToken = await generateRefreshToken(tokenPayload);
    setAccessCookie(res, accessToken);
    setRefreshCookie(res, refreshToken);

    // 建立預設通知設定 & 寄發歡迎信 (fire-and-forget，不影響 promote response)
    const notificationPayload = {
      isDailyNotification: false,
      isWeeklySummaryNotification: false,
      isMonthlyAnalysisNotification: true,
    };
    personnelNotificationServices
      .postPersonnelNotification(promotedUser.id, notificationPayload)
      .catch((err) =>
        console.error('[Promote] Failed to create notification:', err),
      );

    emailService
      .sendWelcomeEmail({
        userName: promotedUser.name,
        to: promotedUser.email,
      })
      .catch((err) =>
        console.error('[Promote] Failed to send welcome email:', err),
      );

    const userInfo = {
      name: promotedUser.name,
      email: promotedUser.email,
      isGuest: false,
    };

    return res
      .status(StatusCodes.OK)
      .json(responseHelper(true, userInfo, '帳號註冊成功！', null));
  });
};

/**
 * GET /api/auth/me
 * 驗證 Session 有效性並回傳當前使用者資訊
 */
const me = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const userId = req.user?.userId;
    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(responseHelper(false, null, 'Unauthorized', null));
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(responseHelper(false, null, 'User not found', null));
    }

    const userInfo = {
      name: user.name,
      email: user.email,
      isGuest: user.isGuest,
    };

    return res
      .status(StatusCodes.OK)
      .json(responseHelper(true, userInfo, 'Authenticated', null));
  });
};

export default { login, logout, guestLogin, promote, me };
