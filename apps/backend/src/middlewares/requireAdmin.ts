import { Request, Response, NextFunction } from 'express';
import { responseHelper } from '@/utils/common';
import { StatusCodes } from 'http-status-codes';
import User from '@/models/user';

/**
 * 安全性(#9)：管理者守衛。必須掛在 authMiddleware 之後（req.user 已設）。
 * 由 DB 讀取 role 判斷，避免把 role 塞進 JWT（管理端點罕見，成本可接受）。
 */
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId as string | undefined;
    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(responseHelper(false, null, 'Unauthorized', null));
    }

    const user = await User.findByPk(userId);
    if (!user || user.role !== 'admin') {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json(responseHelper(false, null, 'Admin privilege required', null));
    }

    next();
  } catch (error) {
    console.error('[requireAdmin] error:', error);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(responseHelper(false, null, 'Internal server error', null));
  }
};
