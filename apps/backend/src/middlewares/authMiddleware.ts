import { Request, Response, NextFunction } from 'express';
import { responseHelper } from '@/utils/common';
import {
  verifyToken,
  generateAccessToken,
  setAccessCookie,
  clearAuthCookie,
} from '@/utils/auth';
import { StatusCodes } from 'http-status-codes';
import User from '@/models/user';

/** Fire-and-forget: 更新使用者的 lastActivityAt */
const updateLastActivity = (userId: string) => {
  User.update({ lastActivityAt: new Date() }, { where: { id: userId } }).catch(
    (err) => {
      console.error('[Auth] Failed to update lastActivityAt:', err);
    },
  );
};

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
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
    // 安全性修復(#37)：refresh token 不得當作 access token 使用；type 為 refresh 時視為無效，落到換證/清除流程。
    // 對舊 token（type 未定義）維持寬鬆，避免既有 session 被強制登出。
    if (accessPayload && accessPayload.type !== 'refresh') {
      req.user = accessPayload;
      updateLastActivity(accessPayload.userId as string);
      return next();
    }

    // 2. Access Token 無效 (被竄改或格式錯誤) -> 強制登出
    if (accessToken && accessError === 'invalid') {
      clearAuthCookie(req, res);
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(responseHelper(false, null, 'Invalid token', null));
    }

    // 3. Access Token 過期 (expired) 或 遺失 (null) -> 嘗試換證
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      // 這裡也要清空，因為可能是 Access Token 過期但沒有 Refresh Token 的情況
      clearAuthCookie(req, res);
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(responseHelper(false, null, 'Unauthorized', null));
    }

    const { payload: refreshPayload } = await verifyToken(refreshToken);
    // 安全性修復(#37)：access token 不得當作 refresh token 使用；type 為 access 時拒絕（type 未定義的舊 token 仍寬鬆放行）。
    if (!refreshPayload || refreshPayload.type === 'access') {
      // Refresh Token 也掛了 -> 清除 Cookie 並回傳 401
      clearAuthCookie(req, res);
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(responseHelper(false, null, 'Session expired', null));
    }

    // 安全性(#8)：換證時比對 tokenVersion，改密碼/重設後既有 refresh token 立即失效。
    const dbUser = await User.findByPk(refreshPayload.userId as string);
    if (
      !dbUser ||
      (refreshPayload.tokenVersion ?? 0) !== (dbUser.tokenVersion ?? 0)
    ) {
      clearAuthCookie(req, res);
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(responseHelper(false, null, 'Session expired', null));
    }

    // 4. 換證成功
    const newPayload = {
      userId: refreshPayload.userId as string,
      email: refreshPayload.email as string,
      isGuest: (refreshPayload.isGuest as boolean) || false,
      tokenVersion: dbUser.tokenVersion ?? 0,
    };

    const newAccessToken = await generateAccessToken(newPayload);

    // 設定新 Cookie (注意：Max-Age 要跟 Refresh Token 一樣長，或依需求設定)
    setAccessCookie(res, newAccessToken);

    // 更新 Request 狀態讓後續 Controller 拿到最新的
    req.cookies.accessToken = newAccessToken;
    req.user = newPayload;

    updateLastActivity(newPayload.userId);

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
          null,
        ),
      );
  }
};
