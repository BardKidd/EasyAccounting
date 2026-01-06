import { SignJWT, jwtVerify } from 'jose';
import dotenv from 'dotenv';
import { Request, Response } from 'express';
dotenv.config();

console.log(
  'JWT_SECRET env check:',
  process.env.JWT_SECRET ? 'Exists' : 'Missing'
);
const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'default_secret_for_dev_only_do_not_use'
);

const JWT_ACCESS_IN = '15m';
const JWT_REFRESH_IN = '7d';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

interface TokenPayload {
  userId: string;
  email: string;
}

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'prd',
  sameSite: 'strict' as const,
  path: '/', //! 會鎖定 cookie 在這個路徑底下
  maxAge: COOKIE_MAX_AGE,
};

export const generateAccessToken = async (payload: TokenPayload) => {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_ACCESS_IN)
    .setIssuer('easy-accounting')
    .setSubject(payload.userId)
    .sign(SECRET);

  return token;
};

export const generateRefreshToken = async (payload: TokenPayload) => {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_REFRESH_IN)
    .setIssuer('easy-accounting')
    .setSubject(payload.userId)
    .sign(SECRET);

  return token;
};

export const verifyToken = async (token: string) => {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return { payload, error: null };
  } catch (error: any) {
    if (error.code === 'ERR_JWT_EXPIRED') {
      return { payload: null, error: 'expired' };
    }
    console.error('JWT Verification Failed:', error);
    return { payload: null, error: 'invalid' };
  }
};

export const setAccessCookie = (res: Response, token: string) => {
  res.cookie('accessToken', token, COOKIE_OPTIONS);
};

export const setRefreshCookie = (res: Response, token: string) => {
  res.cookie('refreshToken', token, COOKIE_OPTIONS);
};

export const clearAuthCookie = (req: Request, res: Response) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
};
