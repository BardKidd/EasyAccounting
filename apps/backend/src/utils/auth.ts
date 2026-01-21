import { SignJWT, jwtVerify } from 'jose';
import dotenv from 'dotenv';
import { Request, Response } from 'express';
dotenv.config();

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'default_secret_for_dev_only_do_not_use',
);

const JWT_ACCESS_IN = '15m';
const JWT_REFRESH_IN = '7d';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

interface TokenPayload {
  userId: string;
  email: string;
}

const isProduction = process.env.NODE_ENV === 'production';
// 判斷是否為雲端環境 (透過 DB Host 判斷)
const isCloudHost =
  !!process.env.PG_HOST &&
  !process.env.PG_HOST.includes('localhost') &&
  !process.env.PG_HOST.includes('127.0.0.1') &&
  !process.env.ORIGIN_URL?.includes('localhost');

const whichDomain = () => {
  // Local 開發時 (Origin 為 localhost)，不設定 Domain (由瀏覽器自動處理)
  if (process.env.ORIGIN_URL?.includes('localhost')) return undefined;

  if (isProduction) return '.riinouo-eaccounting.win';
  if (isCloudHost) return '.dev.riinouo-eaccounting.win';
  return undefined;
};

// 在雲端環境 (不論是 Prod 還是 Dev) 都應啟用 Secure
const isSecure = isProduction || isCloudHost;

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isSecure,
  sameSite: isSecure ? ('none' as const) : ('lax' as const), // Secure 時允許跨域 (None)
  path: '/', //! 會鎖定 cookie 在這個路徑底下
  domain: whichDomain(),
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
  const clearOptions = {
    httpOnly: COOKIE_OPTIONS.httpOnly,
    secure: COOKIE_OPTIONS.secure,
    sameSite: COOKIE_OPTIONS.sameSite,
    path: COOKIE_OPTIONS.path,
    domain: COOKIE_OPTIONS.domain,
  };
  res.clearCookie('accessToken', clearOptions);
  res.clearCookie('refreshToken', clearOptions);
};
