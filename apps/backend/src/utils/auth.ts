import { SignJWT, jwtVerify } from 'jose';
import dotenv from 'dotenv';
import { Request, Response } from 'express';
dotenv.config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env',
});

// 安全性修復：移除硬編碼 fallback，避免 JWT_SECRET 未設定時可被偽造 token
// 於模組載入時 fail-fast：JWT_SECRET 未設或長度不足 32 字元則直接拋錯終止啟動
if (!process.env.JWT_SECRET?.trim() || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET environment variable must be set (>=32 chars)');
}

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

const JWT_ACCESS_IN = '15m';
const JWT_REFRESH_IN = '7d';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export interface TokenPayload {
  userId: string;
  email: string;
  isGuest?: boolean;
  tokenVersion?: number;
}

const isProduction = process.env.NODE_ENV === 'production';
// 判斷是否包含本地端網域或 IP
const hasLocalOrigin = process.env.ORIGIN_URL?.split(',').some((url) => {
  const cleanUrl = url.trim().toLowerCase();
  return (
    cleanUrl.includes('localhost') ||
    cleanUrl.includes('127.0.0.1') ||
    cleanUrl.includes('[::1]') ||
    cleanUrl.includes('192.168.') ||
    cleanUrl.includes('10.') ||
    /172\.(1[6-9]|2[0-9]|3[0-1])\./.test(cleanUrl)
  );
});

// 判斷是否為雲端環境 (透過 DB Host 判斷，且 Origin 不能有任何本地端 IP/網域)
const isCloudHost =
  !!process.env.PG_HOST &&
  !process.env.PG_HOST.includes('localhost') &&
  !process.env.PG_HOST.includes('127.0.0.1') &&
  !hasLocalOrigin;

// 在雲端環境 (不論是 Prod 還是 Dev) 都應啟用 Secure
const isSecure = isProduction || isCloudHost;

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isSecure,
  sameSite: 'lax' as const,
  path: '/', //! 會鎖定 cookie 在這個路徑底下
  // 安全性修復(#27)：預設 host-only cookie（不跨全部子網域共享），僅在營運者明確設定 COOKIE_DOMAIN 時才跨子網域
  domain: process.env.COOKIE_DOMAIN || undefined,
  maxAge: COOKIE_MAX_AGE,
};

export const generateAccessToken = async (payload: TokenPayload) => {
  // 安全性修復(#37)：標記 type: 'access'，避免 refresh token 被當作 access token 使用
  const token = await new SignJWT({ ...payload, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_ACCESS_IN)
    .setIssuer('easy-accounting')
    .setSubject(payload.userId)
    .sign(SECRET);

  return token;
};

export const generateRefreshToken = async (payload: TokenPayload) => {
  // 安全性修復(#37)：標記 type: 'refresh'，避免 access token 被當作 refresh token 使用
  const token = await new SignJWT({ ...payload, type: 'refresh' })
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
    // 安全性修復(#36)：釘住演算法為 HS256 並驗證 issuer，拒絕 alg 混淆或偽造 issuer 的 token
    const { payload } = await jwtVerify(token, SECRET, {
      algorithms: ['HS256'],
      issuer: 'easy-accounting',
    });
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
