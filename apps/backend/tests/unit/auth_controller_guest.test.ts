import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

// ─── Hoisted mock helpers ───
const {
  createMockModel,
  mockTransaction,
  mockGenerateAccessToken,
  mockGenerateRefreshToken,
  mockSetAccessCookie,
  mockSetRefreshCookie,
  mockClearAuthCookie,
  mockBcryptHash,
  mockBcryptCompare,
  mockPostNotification,
  mockSendWelcomeEmail,
} = vi.hoisted(() => ({
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
  mockTransaction: vi.fn(),
  mockGenerateAccessToken: vi.fn(),
  mockGenerateRefreshToken: vi.fn(),
  mockSetAccessCookie: vi.fn(),
  mockSetRefreshCookie: vi.fn(),
  mockClearAuthCookie: vi.fn(),
  mockBcryptHash: vi.fn(),
  mockBcryptCompare: vi.fn(),
  mockPostNotification: vi.fn(),
  mockSendWelcomeEmail: vi.fn(),
}));

// ─── Mock Models ───
vi.mock('@/models/user', () => ({ default: createMockModel() }));
vi.mock('@/models/account', () => ({ default: createMockModel() }));
vi.mock('@/models/transaction', () => ({ default: createMockModel() }));
vi.mock('@/models/TransactionExtra', () => ({ default: createMockModel() }));
vi.mock('@/models/category', () => ({ default: createMockModel() }));
vi.mock('@/models/installmentPlan', () => ({ default: createMockModel() }));
vi.mock('@/models/installmentDetail', () => ({ default: createMockModel() }));
vi.mock('@/models/RecurringTemplate', () => ({ default: createMockModel() }));
vi.mock('@/models/CreditCardDetail', () => ({ default: createMockModel() }));

// ─── Mock Sequelize ───
vi.mock('@/utils/postgres', () => ({
  default: {
    transaction: (...args: any[]) => mockTransaction(...args),
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
vi.mock('@/utils/auth', () => ({
  generateAccessToken: (...args: any[]) => mockGenerateAccessToken(...args),
  generateRefreshToken: (...args: any[]) => mockGenerateRefreshToken(...args),
  setAccessCookie: (...args: any[]) => mockSetAccessCookie(...args),
  setRefreshCookie: (...args: any[]) => mockSetRefreshCookie(...args),
  clearAuthCookie: (...args: any[]) => mockClearAuthCookie(...args),
}));

// ─── Mock simplifyTryCatch ───
vi.mock('@/utils/common', () => ({
  simplifyTryCatch: async (_req: any, _res: any, fn: any) => {
    try {
      await fn();
    } catch (error) {
      _res.status(500).json({ error });
    }
  },
  responseHelper: (
    isSuccess: boolean,
    data: any,
    message: string,
    error: any,
  ) => ({
    isSuccess,
    data,
    message,
    error,
  }),
}));

// ─── Mock External Services ───
vi.mock('@/services/personnelNotificationServices', () => ({
  default: {
    postPersonnelNotification: (...args: any[]) =>
      mockPostNotification(...args),
  },
}));

vi.mock('@/services/emailService', () => ({
  default: {
    sendWelcomeEmail: (...args: any[]) => mockSendWelcomeEmail(...args),
  },
}));

// ─── Mock bcrypt ───
vi.mock('bcrypt', () => ({
  default: {
    hash: (...args: any[]) => mockBcryptHash(...args),
    compare: (...args: any[]) => mockBcryptCompare(...args),
  },
}));

// ─── Now import the things under test ───
import authController from '@/controllers/authController';
import User from '@/models/user';
import bcrypt from 'bcrypt';

// ─── Test Helpers ───
const waitTick = () => new Promise((resolve) => setTimeout(resolve, 0));

const mockRequest = (overrides: Partial<Request> = {}) => {
  return {
    body: {},
    params: {},
    query: {},
    cookies: {},
    user: undefined,
    ...overrides,
  } as unknown as Request;
};

const mockResponse = () => {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.cookie = vi.fn().mockReturnValue(res);
  res.clearCookie = vi.fn().mockReturnValue(res);
  return res;
};

// ─── Tests ───
describe('Auth Controller — Guest Login Features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateAccessToken.mockResolvedValue('mock_access_token');
    mockGenerateRefreshToken.mockResolvedValue('mock_refresh_token');
    mockBcryptHash.mockResolvedValue('hashed_password');
    mockPostNotification.mockResolvedValue(undefined);
    mockSendWelcomeEmail.mockResolvedValue(undefined);
  });

  // ════════════════════════════════════════
  // POST /api/auth/guest-login
  // ════════════════════════════════════════
  describe('guestLogin', () => {
    it('should create a guest user and return 201 with isGuest:true', async () => {
      const fakeUser = {
        id: 'guest-uuid-123',
        name: 'Guest',
        email: 'guest_xxx@easyaccounting.demo',
        isGuest: true,
      };
      (User.create as any).mockResolvedValue(fakeUser);

      const req = mockRequest();
      const res = mockResponse();

      await authController.guestLogin(req, res);
      await waitTick();

      // 驗證 User.create 被呼叫且包含正確欄位
      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Guest',
          isGuest: true,
        }),
      );

      // 驗證 email 格式
      const createArg = (User.create as any).mock.calls[0][0];
      expect(createArg.email).toMatch(/^guest_.*@easyaccounting\.demo$/);

      // 驗證 password 有被 hash
      expect(createArg.password).toBe('hashed_password');

      // 驗證有設 lastActivityAt
      expect(createArg.lastActivityAt).toBeInstanceOf(Date);

      // 驗證 Response
      expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          isSuccess: true,
          data: expect.objectContaining({ isGuest: true, name: 'Guest' }),
        }),
      );
    });

    it('should issue tokens with isGuest:true in payload', async () => {
      const fakeUser = {
        id: 'guest-uuid-456',
        name: 'Guest',
        email: 'guest_abc@easyaccounting.demo',
        isGuest: true,
      };
      (User.create as any).mockResolvedValue(fakeUser);

      const req = mockRequest();
      const res = mockResponse();

      await authController.guestLogin(req, res);
      await waitTick();

      // 驗證 token payload 含 isGuest: true
      expect(mockGenerateAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'guest-uuid-456',
          isGuest: true,
        }),
      );
      expect(mockGenerateRefreshToken).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'guest-uuid-456',
          isGuest: true,
        }),
      );

      // 驗證 cookie 有被設定
      expect(mockSetAccessCookie).toHaveBeenCalledWith(
        res,
        'mock_access_token',
      );
      expect(mockSetRefreshCookie).toHaveBeenCalledWith(
        res,
        'mock_refresh_token',
      );
    });
  });

  // ════════════════════════════════════════
  // POST /api/auth/login — Guest Rejection
  // ════════════════════════════════════════
  describe('login — guest rejection (FR-1)', () => {
    it('should return 401 (generic) if user is a guest account', async () => {
      const guestUser = {
        id: 'guest-id',
        email: 'guest_xxx@easyaccounting.demo',
        password: 'hashed_pw',
        isGuest: true,
      };
      (User.findOne as any).mockResolvedValue(guestUser);

      const req = mockRequest({
        body: {
          email: 'guest_xxx@easyaccounting.demo',
          password: 'any_password',
        },
      });
      const res = mockResponse();

      await authController.login(req, res);
      await waitTick();

      // SECURITY (#12)：guest 拒絕改回傳與其他失敗相同的 401 generic，避免帳號列舉
      expect(res.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          isSuccess: false,
        }),
      );
      // 不應比對密碼
      expect(mockBcryptCompare).not.toHaveBeenCalled();
    });

    it('should allow login for regular (non-guest) user', async () => {
      const regularUser = {
        id: 'user-id',
        name: 'Regular User',
        email: 'regular@example.com',
        password: 'hashed_pw',
        isGuest: false,
      };
      (User.findOne as any).mockResolvedValue(regularUser);
      mockBcryptCompare.mockResolvedValue(true);

      const req = mockRequest({
        body: { email: 'regular@example.com', password: 'correct_pw' },
      });
      const res = mockResponse();

      await authController.login(req, res);
      await waitTick();

      expect(mockBcryptCompare).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(mockGenerateAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({ isGuest: false }),
      );
    });
  });

  // ════════════════════════════════════════
  // POST /api/auth/promote
  // ════════════════════════════════════════
  describe('promote', () => {
    const makePromoteRequest = (userId: string, body: any) =>
      mockRequest({
        user: { userId, email: 'old@demo.com', isGuest: true } as any,
        body,
      });

    // Helper: 設定 sequelize.transaction mock 以執行 callback
    const setupTransactionMock = () => {
      const fakeTx = { LOCK: { UPDATE: 'UPDATE' } };
      mockTransaction.mockImplementation(async (cb: any) => cb(fakeTx));
    };

    it('should promote guest to regular user (happy path)', async () => {
      setupTransactionMock();

      const mockUser = {
        id: 'guest-to-promote',
        name: 'New User',
        email: 'new@example.com',
        isGuest: true,
        update: vi.fn().mockResolvedValue(undefined),
      };

      (User.findByPk as any).mockResolvedValue(mockUser);
      (User.findOne as any).mockResolvedValue(null); // email 沒被用過

      const req = makePromoteRequest('guest-to-promote', {
        name: 'New User',
        email: 'new@example.com',
        password: 'StrongPassword123!',
      });
      const res = mockResponse();

      await authController.promote(req, res);
      await waitTick();

      // 驗證 user.update 被呼叫
      expect(mockUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New User',
          email: 'new@example.com',
          isGuest: false,
        }),
        expect.objectContaining({ transaction: expect.anything() }),
      );

      // 驗證 Token 重簽
      expect(mockGenerateAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'guest-to-promote',
          email: 'new@example.com',
          isGuest: false,
        }),
      );

      // 驗證通知設定和歡迎信
      expect(mockPostNotification).toHaveBeenCalledWith(
        'guest-to-promote',
        expect.anything(),
      );
      expect(mockSendWelcomeEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          userName: 'New User',
          to: 'new@example.com',
        }),
      );

      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });

    it('should return 409 if email already exists', async () => {
      setupTransactionMock();

      const mockUser = {
        id: 'guest-id',
        isGuest: true,
      };

      (User.findByPk as any).mockResolvedValue(mockUser);
      (User.findOne as any).mockResolvedValue({ id: 'existing-user' }); // email 已被使用

      const req = makePromoteRequest('guest-id', {
        name: 'Conflict User',
        email: 'taken@example.com',
        password: 'Pw123!',
      });
      const res = mockResponse();

      await authController.promote(req, res);
      await waitTick();

      expect(res.status).toHaveBeenCalledWith(StatusCodes.CONFLICT);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ isSuccess: false }),
      );
    });

    it('should return 400 if account is already a regular user', async () => {
      setupTransactionMock();

      const mockUser = {
        id: 'regular-id',
        isGuest: false,
      };

      (User.findByPk as any).mockResolvedValue(mockUser);

      const req = makePromoteRequest('regular-id', {
        name: 'X',
        email: 'x@example.com',
        password: 'Pw123!',
      });
      const res = mockResponse();

      await authController.promote(req, res);
      await waitTick();

      expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
    });

    it('should return 404 if user not found', async () => {
      setupTransactionMock();

      (User.findByPk as any).mockResolvedValue(null);

      const req = makePromoteRequest('non-existent', {
        name: 'X',
        email: 'x@example.com',
        password: 'Pw123!',
      });
      const res = mockResponse();

      await authController.promote(req, res);
      await waitTick();

      expect(res.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
    });

    it('should return 401 if userId is missing from request', async () => {
      const req = mockRequest({
        user: undefined,
        body: { name: 'X', email: 'x@x.com', password: '123' },
      });
      const res = mockResponse();

      await authController.promote(req, res);
      await waitTick();

      expect(res.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
    });
  });
});
