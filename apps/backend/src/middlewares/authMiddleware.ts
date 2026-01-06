import { Request, Response, NextFunction } from 'express';
import { responseHelper } from '@/utils/common';
import {
  verifyToken,
  generateAccessToken,
  setAccessCookie,
} from '@/utils/auth';
import { StatusCodes } from 'http-status-codes';

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const accessToken = req.cookies.accessToken;
    let accessPayload = null;
    let accessError = null;

    if (accessToken) {
      const result = await verifyToken(accessToken);
      accessPayload = result.payload;
      accessError = result.error;
    }

    // 1. Access Token 有效 -> 直接放行
    if (accessPayload) {
      req.user = accessPayload;
      return next();
    }

    // 2. Access Token 無效 (被竄改或格式錯誤) -> 強制登出
    if (accessToken && accessError === 'invalid') {
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(responseHelper(false, null, 'Invalid token', null));
    }

    // 3. Access Token 過期 (expired) 或 遺失 (null) -> 嘗試換證
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      // 這裡也要清空，因為可能是 Access Token 過期但沒有 Refresh Token 的情況
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(responseHelper(false, null, 'Unauthorized', null));
    }

    const { payload: refreshPayload } = await verifyToken(refreshToken);
    if (!refreshPayload) {
      // Refresh Token 也掛了 -> 清除 Cookie 並回傳 401
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(responseHelper(false, null, 'Session expired', null));
    }

    // 4. 換證成功
    const newPayload = {
      userId: refreshPayload.userId as string,
      email: refreshPayload.email as string,
    };

    const newAccessToken = await generateAccessToken(newPayload);

    // 設定新 Cookie (注意：Max-Age 要跟 Refresh Token 一樣長，或依需求設定)
    setAccessCookie(res, newAccessToken);

    // 更新 Request 狀態讓後續 Controller 拿到最新的
    req.cookies.accessToken = newAccessToken;
    req.user = newPayload;

    next();
  } catch (error) {
    console.log('[Auth middleware error] :', error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(
        responseHelper(
          false,
          null,
          'Internal server error during authentication',
          null
        )
      );
  }
};
