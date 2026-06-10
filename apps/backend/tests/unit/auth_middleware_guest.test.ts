import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authMiddleware } from '@/middlewares/authMiddleware';
import * as AuthUtils from '@/utils/auth';
import { Request, Response, NextFunction } from 'express';

// ─── Mock Models ───
const mockUserUpdate = vi.fn().mockResolvedValue([1]);

const { createMockModel } = vi.hoisted(() => ({
  createMockModel: () => ({
    create: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    destroy: vi.fn(),
    findByPk: vi.fn(),
    findAll: vi.fn(),
    addHook: vi.fn(),
    hasMany: vi.fn(),
    belongsTo: vi.fn(),
    belongsToMany: vi.fn(),
    hasOne: vi.fn(),
  }),
}));

vi.mock('@/models/user', () => ({
  default: {
    ...createMockModel(),
    update: (...args: any[]) => mockUserUpdate(...args),
  },
}));

vi.mock('@/models/account', () => ({ default: createMockModel() }));
vi.mock('@/models/transaction', () => ({ default: createMockModel() }));
vi.mock('@/models/TransactionExtra', () => ({ default: createMockModel() }));
vi.mock('@/models/category', () => ({ default: createMockModel() }));
vi.mock('@/models/installmentPlan', () => ({ default: createMockModel() }));
vi.mock('@/models/installmentDetail', () => ({ default: createMockModel() }));
vi.mock('@/models/RecurringTemplate', () => ({ default: createMockModel() }));
vi.mock('@/models/CreditCardDetail', () => ({ default: createMockModel() }));

vi.mock('@/utils/postgres', () => ({
  default: {
    define: vi.fn(() => ({
      hasMany: vi.fn(),
      belongsTo: vi.fn(),
      belongsToMany: vi.fn(),
      hasOne: vi.fn(),
    })),
  },
  TABLE_DEFAULT_SETTING: {
    underscored: true,
    timestamps: true,
    paranoid: true,
  },
}));

// ─── Mock Auth Utils ───
vi.mock('@/utils/auth');

// ─── Test Helpers ───
const createReqResMocks = (cookies: Record<string, string> = {}) => {
  const req: Partial<Request> = { cookies };
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
    cookie: vi.fn(),
    clearCookie: vi.fn(),
  };
  const next: NextFunction = vi.fn();
  return { req: req as Request, res: res as Response, next };
};

// ─── Tests ───
describe('Auth Middleware — Guest-specific behaviors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('lastActivityAt update (Task 4.2)', () => {
    it('should fire-and-forget User.update with lastActivityAt when access token is valid', async () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        isGuest: true,
      };
      vi.mocked(AuthUtils.verifyToken).mockResolvedValue({
        payload,
        error: null,
      });

      const { req, res, next } = createReqResMocks({
        accessToken: 'valid_token',
      });

      await authMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      // 驗證 User.update 被呼叫來更新 lastActivityAt
      expect(mockUserUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          lastActivityAt: expect.any(Date),
        }),
        expect.objectContaining({
          where: { id: 'user-123' },
        }),
      );
    });

    it('should also trigger lastActivityAt update on token refresh path', async () => {
      // Access token 過期
      vi.mocked(AuthUtils.verifyToken).mockResolvedValueOnce({
        payload: null,
        error: 'expired',
      });

      // Refresh token 有效
      const refreshPayload = {
        userId: 'user-456',
        email: 'guest@demo.com',
        isGuest: true,
      };
      vi.mocked(AuthUtils.verifyToken).mockResolvedValueOnce({
        payload: refreshPayload,
        error: null,
      });

      vi.mocked(AuthUtils.generateAccessToken).mockResolvedValue(
        'new_access_token',
      );

      const { req, res, next } = createReqResMocks({
        accessToken: 'expired_token',
        refreshToken: 'valid_refresh',
      });

      await authMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      // 驗證 refresh 路徑也觸發 lastActivityAt
      expect(mockUserUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          lastActivityAt: expect.any(Date),
        }),
        expect.objectContaining({
          where: { id: 'user-456' },
        }),
      );
    });
  });

  describe('isGuest propagation on token refresh (Task 4.2)', () => {
    it('should preserve isGuest:true in new token payload when refreshing', async () => {
      // Access token 過期
      vi.mocked(AuthUtils.verifyToken).mockResolvedValueOnce({
        payload: null,
        error: 'expired',
      });

      // Refresh token 有效，含 isGuest
      const refreshPayload = {
        userId: 'guest-789',
        email: 'guest_xyz@easyaccounting.demo',
        isGuest: true,
      };
      vi.mocked(AuthUtils.verifyToken).mockResolvedValueOnce({
        payload: refreshPayload,
        error: null,
      });

      vi.mocked(AuthUtils.generateAccessToken).mockResolvedValue(
        'new_guest_token',
      );

      const { req, res, next } = createReqResMocks({
        accessToken: 'expired',
        refreshToken: 'valid_refresh',
      });

      await authMiddleware(req, res, next);

      // 驗證 generateAccessToken 傳入的 payload 包含 isGuest: true
      expect(AuthUtils.generateAccessToken).toHaveBeenCalledWith({
        userId: 'guest-789',
        email: 'guest_xyz@easyaccounting.demo',
        isGuest: true,
      });

      // 驗證 req.user 也包含 isGuest
      expect(req.user).toEqual(expect.objectContaining({ isGuest: true }));
    });

    it('should default isGuest to false when refresh token has no isGuest field', async () => {
      vi.mocked(AuthUtils.verifyToken).mockResolvedValueOnce({
        payload: null,
        error: 'expired',
      });

      // 舊的 refresh token 可能沒有 isGuest 欄位
      const refreshPayload = {
        userId: 'old-user',
        email: 'old@example.com',
        // 沒有 isGuest
      };
      vi.mocked(AuthUtils.verifyToken).mockResolvedValueOnce({
        payload: refreshPayload,
        error: null,
      });

      vi.mocked(AuthUtils.generateAccessToken).mockResolvedValue('new_token');

      const { req, res, next } = createReqResMocks({
        accessToken: 'expired',
        refreshToken: 'valid',
      });

      await authMiddleware(req, res, next);

      // isGuest 應該 fallback 為 false
      expect(AuthUtils.generateAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({ isGuest: false }),
      );
    });
  });
});
