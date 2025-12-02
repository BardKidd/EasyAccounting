import { SignJWT, jwtVerify } from 'jose';
import dotenv from 'dotenv';
import { Response } from 'express';
dotenv.config();

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

const JWT_ACCESS_IN = '15m';
const JWT_REFRESH_IN = '7d';

interface TokenPayload {
  userId: string;
  email: string;
}

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'prd',
  sameSite: 'strict' as const,
  maxAge: 15 * 60 * 1000,
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
    return payload;
  } catch (error) {
    return null;
  }
};

export const setAuthCookie = (res: Response, token: string) => {
  res.cookie('token', token, COOKIE_OPTIONS);
};

export const clearAuthCookie = (res: Response) => {
  res.clearCookie('token');
};
