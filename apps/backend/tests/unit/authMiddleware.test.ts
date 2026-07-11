import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authMiddleware } from '@/middlewares/authMiddleware';
import * as AuthUtils from '@/utils/auth';
import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';

// Mock dependencies
vi.mock('@/utils/auth');

// 安全性(#8)：authMiddleware refresh 路徑會 User.findByPk 比對 tokenVersion，需 mock
vi.mock('@/models/user', () => ({
  default: {
    findByPk: vi.fn().mockResolvedValue({ tokenVersion: 0 }),
    update: vi.fn().mockResolvedValue([1]),
  },
}));

describe('Auth Middleware Unit Test', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      cookies: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    };
    next = vi.fn();
    vi.clearAllMocks();
  });

  it('should pass if access token is valid', async () => {
    req.cookies = { accessToken: 'valid_token' };
    const mockPayload = { userId: '123', email: 'test@example.com' };

    vi.mocked(AuthUtils.verifyToken).mockResolvedValue({
      payload: mockPayload,
      error: null,
    });

    await authMiddleware(req as Request, res as Response, next);

    expect(req.user).toEqual(mockPayload);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 401 and clear cookies if access token is invalid (tampered)', async () => {
    req.cookies = { accessToken: 'invalid_token' };

    vi.mocked(AuthUtils.verifyToken).mockResolvedValue({
      payload: null,
      error: 'invalid', // Simulate signature mismatch/malformed
    });

    await authMiddleware(req as Request, res as Response, next);

    expect(AuthUtils.clearAuthCookie).toHaveBeenCalledWith(req, res);
    expect(res.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
    expect(next).not.toHaveBeenCalled();
  });

  it('should refresh token if access token is expired but refresh token is valid', async () => {
    req.cookies = {
      accessToken: 'expired_token',
      refreshToken: 'valid_refresh_token',
    };

    // 1. Mock Access Token Expired
    vi.mocked(AuthUtils.verifyToken).mockResolvedValueOnce({
      payload: null,
      error: 'expired',
    });

    // 2. Mock Refresh Token Valid
    const refreshPayload = { userId: '123', email: 'test@example.com' };
    vi.mocked(AuthUtils.verifyToken).mockResolvedValueOnce({
      payload: refreshPayload,
      error: null,
    });

    // 3. Mock Generate new Token
    const newAccessToken = 'new_access_token';
    vi.mocked(AuthUtils.generateAccessToken).mockResolvedValue(newAccessToken);

    await authMiddleware(req as Request, res as Response, next);

    // Assertions
    expect(AuthUtils.verifyToken).toHaveBeenCalledTimes(2); // Access then Refresh
    expect(AuthUtils.generateAccessToken).toHaveBeenCalledWith({
      ...refreshPayload,
      isGuest: false,
      tokenVersion: 0,
    });
    expect(AuthUtils.setAccessCookie).toHaveBeenCalledWith(res, newAccessToken);

    // Check request mutation
    expect(req.cookies?.accessToken).toBe(newAccessToken);
    expect(req.user).toEqual({
      ...refreshPayload,
      isGuest: false,
      tokenVersion: 0,
    });
    expect(next).toHaveBeenCalled();
  });

  it('should return 401 if access token expired and refresh token is missing', async () => {
    req.cookies = { accessToken: 'expired_token' }; // No refresh token

    vi.mocked(AuthUtils.verifyToken).mockResolvedValue({
      payload: null,
      error: 'expired',
    });

    await authMiddleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
    expect(AuthUtils.clearAuthCookie).toHaveBeenCalledWith(req, res);
    expect(AuthUtils.verifyToken).toHaveBeenCalledTimes(1); // Only checked access
  });

  it('should return 401 if access token expired and refresh token is also invalid', async () => {
    req.cookies = {
      accessToken: 'expired_token',
      refreshToken: 'invalid_refresh_token',
    };

    vi.mocked(AuthUtils.verifyToken)
      .mockResolvedValueOnce({ payload: null, error: 'expired' }) // Access
      .mockResolvedValueOnce({ payload: null, error: 'invalid' }); // Refresh

    await authMiddleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
    expect(AuthUtils.clearAuthCookie).toHaveBeenCalledWith(req, res);
  });
});
