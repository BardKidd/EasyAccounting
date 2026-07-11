import User from '@/models/user';
import PasswordResetToken from '@/models/PasswordResetToken';
import { responseHelper, simplifyTryCatch } from '@/utils/common';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
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

// SECURITY (#14 timing attack): 當帳號不存在時，仍以此固定 dummy hash 執行一次 bcrypt.compare，
// 讓「帳號不存在」與「密碼錯誤」的回應時間相近，避免依耗時列舉出哪些 email 已註冊。
const DUMMY_PASSWORD_HASH =
  '$2b$12$miGrDmByOoHeUmgtAudgkOJye.gyTHcujaJQ1lrOh3L15yciqNR4C';

/**
 * IP Geolocation via ipinfo.io (HTTPS)
 * Fallback: 回傳「位置未知」
 */
const getIpLocation = async (
  ip: string,
): Promise<{ city: string; country: string }> => {
  try {
    // localhost / private IP 不查詢
    if (
      ip === '127.0.0.1' ||
      ip === '::1' ||
      ip === '::ffff:127.0.0.1' ||
      ip.startsWith('192.168.') ||
      ip.startsWith('10.')
    ) {
      return { city: 'localhost', country: 'Local' };
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(`https://ipinfo.io/${ip}/json`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) throw new Error(`ipinfo.io returned ${response.status}`);
    const data = await response.json();
    return {
      city: data.city || '未知',
      country: data.country || '未知',
    };
  } catch (error) {
    console.error('[Auth] IP geolocation failed:', error);
    return { city: '未知', country: '未知' };
  }
};

const RESET_TOKEN_EXPIRY_MINUTES = 15;
const MAX_RESET_EMAILS_PER_WINDOW = 3;

const login = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const { email, password } = req.body;
    // SECURITY (#12 帳號列舉): 帳號不存在、訪客帳號、密碼錯誤三種失敗情境
    // 一律回傳相同的 401 與相同 generic 訊息，不洩漏是哪一個條件失敗。
    const genericAuthError = '帳號或密碼錯誤';
    const user = await User.findOne({ where: { email } });
    if (!user) {
      // SECURITY (#14 timing attack): 帳號不存在時仍執行一次 bcrypt.compare，
      // 使回應時間與帳號存在時相近。
      await comparePassword(password, DUMMY_PASSWORD_HASH);
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(responseHelper(false, null, genericAuthError, null));
    }

    // FR-1: 禁止透過一般登入形式登入 Guest 帳號（回傳與其他失敗情境相同的 generic 訊息）
    if (user.isGuest) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(responseHelper(false, null, genericAuthError, null));
    }

    const compareResult = await comparePassword(password, user.password);
    if (!compareResult) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(responseHelper(false, null, genericAuthError, null));
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      isGuest: false,
      tokenVersion: user.tokenVersion ?? 0,
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
      tokenVersion: user.tokenVersion ?? 0,
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
      tokenVersion: promotedUser.tokenVersion ?? 0,
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
      baseCurrencyCode: (user as any).baseCurrencyCode ?? 'TWD',
    };

    return res
      .status(StatusCodes.OK)
      .json(responseHelper(true, userInfo, 'Authenticated', null));
  });
};

/**
 * POST /api/auth/forgot-password
 * 產生 reset token 並寄送重設密碼信件
 */
const forgotPassword = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const { email } = req.body;
    const genericMessage = '若此信箱已註冊，您將收到重設密碼的信件';

    // 不論結果都回傳成功（防止 email 列舉攻擊）
    const user = await User.findOne({ where: { email } });
    if (!user || user.isGuest) {
      // SECURITY (#29 timing attack): 帳號不存在/訪客時，正常會提早返回，比「真的寄信」路徑
      // 少跑一次 count 與一次 token 交易，讓攻擊者可用回應耗時列舉出哪些 email 已註冊。
      // 這裡以等量的唯讀 dummy DB 工作補平：一次 count + 一個交易內兩次 count，
      // 對齊真實路徑（count + 交易內 update/insert）的往返數，使兩條路徑耗時相近。
      // 註：per-email 超限路徑仍略快，但需先對同一 email 連發 3 次才觸發，
      //     對「單次探測是否已註冊」的列舉無實益，故不在此補平（見下方 rate limit 區塊）。
      const dummyUserId = uuidv4();
      await PasswordResetToken.count({ where: { userId: dummyUserId } } as any);
      await sequelize.transaction(async (t) => {
        await PasswordResetToken.count({
          where: { userId: dummyUserId },
          transaction: t,
        } as any);
        await PasswordResetToken.count({
          where: { userId: dummyUserId },
          transaction: t,
        } as any);
      });
      return res
        .status(StatusCodes.OK)
        .json(responseHelper(true, null, genericMessage, null));
    }

    // Per-email rate limiting: 15 分鐘內最多 3 封（NFR-4 per-email 閘門）
    const windowStart = new Date(
      Date.now() - RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000,
    );
    const recentTokenCount = await PasswordResetToken.count({
      where: {
        userId: user.id,
        createdAt: { [Op.gt]: windowStart },
      } as any,
    });

    if (recentTokenCount >= MAX_RESET_EMAILS_PER_WINDOW) {
      // NFR-3：超限時不寄信，但回傳與正常路徑完全相同的 generic 200，
      // 不洩漏該 email 是否存在於 DB（防帳號列舉）。
      return res
        .status(StatusCodes.OK)
        .json(responseHelper(true, null, genericMessage, null));
    }

    // 產生 token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');
    const expiresAt = new Date(
      Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000,
    );

    // FR-7：新 token 產生時，先作廢該使用者所有尚未使用的舊 token（同一時間只有最新一封有效），
    // invalidate + create 包在同一交易，避免中途失敗留下不一致狀態。
    await sequelize.transaction(async (t) => {
      await PasswordResetToken.update(
        { usedAt: new Date() },
        { where: { userId: user.id, usedAt: null }, transaction: t },
      );
      await PasswordResetToken.create(
        {
          userId: user.id,
          token: hashedToken,
          expiresAt,
        },
        { transaction: t },
      );
    });

    // 先取得 IP（同步可用），組合連結
    const clientIp = req.ip || '未知';
    // SECURITY (#30): ORIGIN_URL 可能是逗號分隔的多個 origin（CORS 白名單），
    // 只取第一個並去除空白，避免產生含逗號的無效重設連結。
    const frontendUrl =
      process.env.ORIGIN_URL?.split(',')[0]?.trim() || 'http://localhost:3001';
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;
    const supportEmail =
      process.env.SUPPORT_EMAIL_FROM || 'support@riinouo-eaccounting.win';

    // 先回傳 response，geolocation + 寄信在背景執行 (fire-and-forget)
    res
      .status(StatusCodes.OK)
      .json(responseHelper(true, null, genericMessage, null));

    // 背景非同步：查 geolocation → 寄信
    (async () => {
      const { city, country } = await getIpLocation(clientIp);
      const locationStr = `${city}, ${country}`;
      const operationTime = new Date().toLocaleString('zh-TW', {
        timeZone: 'Asia/Taipei',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      await emailService.sendPasswordResetEmail({
        userName: user.name,
        to: user.email,
        resetUrl,
        ipAddress: clientIp,
        location: locationStr,
        operationTime,
        supportEmail,
      });
    })().catch((err) =>
      console.error('[Auth] Failed to send password reset email:', err),
    );
  });
};

/**
 * POST /api/auth/reset-password
 * 驗證 token 並重設密碼
 */
const resetPassword = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const { token, password } = req.body;

    // SHA-256 hash the incoming raw token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // O(1) indexed lookup
    const resetRecord = await PasswordResetToken.findOne({
      where: {
        token: hashedToken,
        expiresAt: { [Op.gt]: new Date() },
        usedAt: null,
      },
    });

    if (!resetRecord) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          responseHelper(
            false,
            null,
            '無效或已過期的重設連結，請重新申請',
            null,
          ),
        );
    }

    const user = await User.findByPk(resetRecord.userId);
    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(responseHelper(false, null, '使用者不存在', null));
    }

    // DB Transaction: 密碼更新 + token 標記必須原子性完成
    await sequelize.transaction(async (t) => {
      const hashedPassword = await bcrypt.hash(password, 12);
      // 安全性(#8)：改密碼時 tokenVersion +1，使既有 refresh token 立即失效
      await user.update(
        {
          password: hashedPassword,
          tokenVersion: (user.tokenVersion ?? 0) + 1,
        },
        { transaction: t },
      );
      await resetRecord.update({ usedAt: new Date() }, { transaction: t });
    });

    return res
      .status(StatusCodes.OK)
      .json(responseHelper(true, null, '密碼已重設成功', null));
  });
};

export default {
  login,
  logout,
  guestLogin,
  promote,
  me,
  forgotPassword,
  resetPassword,
};
