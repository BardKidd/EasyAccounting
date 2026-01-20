import User from '@/models/user';
import { responseHelper, simplifyTryCatch } from '@/utils/common';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import bcrypt from 'bcrypt';
import {
  generateAccessToken,
  generateRefreshToken,
  setAccessCookie,
  setRefreshCookie,
  clearAuthCookie,
} from '@/utils/auth';

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
    const compareResult = await comparePassword(password, user.password);
    if (!compareResult) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(responseHelper(false, null, '帳號或密碼錯誤', null));
    }

    const accessToken = await generateAccessToken({
      userId: user.id,
      email: user.email,
    });
    const refreshToken = await generateRefreshToken({
      userId: user.id,
      email: user.email,
    });

    if (!accessToken) {
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json(
          responseHelper(false, null, 'Generate Access Token failed', null)
        );
    }
    setAccessCookie(res, accessToken);

    if (!refreshToken) {
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json(
          responseHelper(false, null, 'Generate Refresh Token failed', null)
        );
    }
    setRefreshCookie(res, refreshToken);

    const userInfo = {
      name: user.name,
      email: user.email,
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

export default { login, logout };
