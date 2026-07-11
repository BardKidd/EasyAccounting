import { Request, Response } from 'express';
import User from '@/models/user';
import { StatusCodes } from 'http-status-codes';

const getUserFromDB = async (req: Request, res: Response) => {
  // 安全性修復（IDOR）：一律以已驗證的使用者為對象，忽略 URL path :id，避免跨使用者存取
  const userId = (req as any).user?.userId;
  const user = await User.findByPk(userId);
  if (!user) {
    res.status(StatusCodes.NOT_FOUND).json({
      message: 'User not found',
    });
    return;
  }
  return user;
};

export default {
  getUserFromDB,
};
