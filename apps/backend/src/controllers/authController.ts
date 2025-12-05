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
        .status(StatusCodes.NOT_FOUND)
        .json(responseHelper(false, null, 'User not found', null));
    }
    const compareResult = await comparePassword(password, user.password);
    if (!compareResult) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(responseHelper(false, null, 'Invalid password', null));
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
      emailNotification: user.emailNotification,
    };

    return res
      .status(StatusCodes.OK)
      .json(responseHelper(true, userInfo, 'Login successfully', null));
  });
};

export default { login };
