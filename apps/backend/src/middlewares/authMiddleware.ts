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

    let payload = accessToken ? await verifyToken(accessToken) : null;

    // accessToken 過期的話去換 token
    console.log('payload===================', payload);
    if (!payload) {
      const refreshToken = req.cookies.refreshToken;

      // refreshToken 也過期了就重新登入
      if (!refreshToken) {
        console.log('refreshToken also expired');
        res
          .status(StatusCodes.UNAUTHORIZED)
          .json(responseHelper(false, null, 'Unauthorized', null));
        return;
      }

      const refreshPayload = await verifyToken(refreshToken);
      console.log('refreshPayload===================', refreshPayload);
      if (!refreshPayload) {
        res
          .status(StatusCodes.UNAUTHORIZED)
          .json(responseHelper(false, null, 'Unauthorized', null));
        return;
      }

      const newPayload = {
        userId: refreshPayload.userId as string,
        email: refreshPayload.email as string,
      };

      // 更新 accessToken
      const newAccessToken = await generateAccessToken(newPayload);
      setAccessCookie(res, newAccessToken);

      payload = refreshPayload;
    }

    req.user = payload;
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
