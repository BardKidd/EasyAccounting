import { Request, Response } from 'express';
import { simplifyTryCatch, responseHelper } from '@/utils/common';
import User from '@/models/user';
import { StatusCodes } from 'http-status-codes';
import bcrypt from 'bcrypt';
import { UserType } from '@repo/shared';
import userServices from '@/services/userServices';
import personnelNotificationServices from '@/services/personnelNotificationServices';
import emailService from '@/services/emailService';
import { changeBaseCurrency } from '@/services/baseCurrencyService';

const getUser = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const userInstance = await userServices.getUserFromDB(req, res);
    if (!userInstance) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(responseHelper(false, null, 'User not found', null));
    }
    const userJson = userInstance.toJSON();
    const sortedUser: UserType = {
      name: userJson.name,
      email: userJson.email,
      isGuest: userJson.isGuest ?? false,
      baseCurrencyCode: userJson.baseCurrencyCode ?? 'TWD',
    };
    res
      .status(StatusCodes.OK)
      .json(responseHelper(true, sortedUser, 'Get user successfully', null));
  });
};

const addUser = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const { password, ...otherData } = req.body;
    const hashedPassword = await bcrypt.hash(password, 12);
    let user;
    try {
      user = await User.create({
        ...otherData,
        password: hashedPassword,
      });
    } catch (error) {
      // 安全修復：email 重複時攔截 unique constraint 錯誤，回傳統一訊息，
      // 避免洩漏原始 DB 錯誤內容或透露該 email 是否已存在
      if (error instanceof Error && error.name === 'SequelizeUniqueConstraintError') {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json(responseHelper(false, null, '註冊失敗，請確認資料是否正確', null));
      }
      throw error;
    }

    // 預設只打開月報
    const payload = {
      isDailyNotification: false,
      isWeeklySummaryNotification: false,
      isMonthlyAnalysisNotification: true,
    };

    await personnelNotificationServices.postPersonnelNotification(
      user.id,
      payload,
    );

    await emailService.sendWelcomeEmail({
      userName: user.name,
      to: user.email,
    });

    res
      .status(StatusCodes.CREATED)
      .json(responseHelper(true, null, 'User created successfully', null));
  });
};

const editUser = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const userInstance = await userServices.getUserFromDB(req, res);
    if (!userInstance) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(responseHelper(false, null, 'User not found', null));
    }
    const { password, ...otherData } = req.body;
    const hashedPassword = await bcrypt.hash(password, 12);
    userInstance
      .update({
        ...otherData,
        password: hashedPassword,
      })
      .then(() => {
        res
          .status(StatusCodes.OK)
          .json(responseHelper(true, null, 'User updated successfully', null));
      });
  });
};

const deleteUser = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const userInstance = await userServices.getUserFromDB(req, res);
    if (!userInstance) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(responseHelper(false, null, 'User not found', null));
    }

    userInstance.destroy().then(() => {
      res
        .status(StatusCodes.OK)
        .json(responseHelper(true, null, 'User deleted successfully', null));
    });
  });
};

// ── 個人檔案（self-scoped）：身分一律取自 token，不吃 URL/body 的 userId ──

const updateProfile = async (req: Request, res: Response) => {
  await simplifyTryCatch(req, res, async () => {
    const userInstance = await userServices.getUserFromDB(req, res);
    if (!userInstance) return; // getUserFromDB 已回 404
    const { name } = req.body;
    await userInstance.update({ name });
    res
      .status(StatusCodes.OK)
      .json(responseHelper(true, { name }, '個人資料已更新', null));
  });
};

// 切換本位幣（決策 Q1：用歷史匯率一次性重算 amountInBase；缺匯率則整批中止並回報）
const changeBaseCurrencyHandler = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(responseHelper(false, null, 'Unauthorized', null));
    }
    const { baseCurrencyCode } = req.body;
    try {
      const result = await changeBaseCurrency(userId, baseCurrencyCode);
      res
        .status(StatusCodes.OK)
        .json(responseHelper(true, result, '本位幣切換成功', null));
    } catch (err: any) {
      // 缺匯率等業務錯誤：回 400 並帶訊息（含缺漏清單）
      res
        .status(StatusCodes.BAD_REQUEST)
        .json(responseHelper(false, null, err?.message || '切換失敗', null));
    }
  });
};

export default {
  addUser,
  getUser,
  editUser,
  deleteUser,
  updateProfile,
  changeBaseCurrency: changeBaseCurrencyHandler,
};
