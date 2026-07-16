import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

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

vi.mock('@/models/user', () => ({ default: createMockModel() }));

vi.mock('@/utils/postgres', () => {
  const mSequelize = {
    // 支援兩種呼叫風格：callback-style（deleteMe 用） + legacy 手動 commit/rollback 風格
    transaction: vi.fn((arg?: any) =>
      typeof arg === 'function'
        ? arg({})
        : { commit: vi.fn(), rollback: vi.fn() },
    ),
    define: vi.fn(() => ({
      hasMany: vi.fn(),
      belongsTo: vi.fn(),
      belongsToMany: vi.fn(),
      hasOne: vi.fn(),
      addHook: vi.fn(),
    })),
  };
  return {
    default: mSequelize,
    TABLE_DEFAULT_SETTING: { underscored: true, timestamps: true, paranoid: true },
  };
});

vi.mock('@/utils/common', () => ({
  simplifyTryCatch: async (req: any, res: any, fn: any) => {
    try {
      await fn();
    } catch (error) {
      res.status(500).json({ error });
    }
  },
  responseHelper: (isSuccess: boolean, data: any, message: string, error: any) => ({
    isSuccess,
    data,
    message,
    error,
  }),
}));

vi.mock('@/services/emailService', () => ({
  default: { sendWelcomeEmail: vi.fn() },
}));
vi.mock('@/services/personnelNotificationServices', () => ({
  default: { postPersonnelNotification: vi.fn() },
}));
vi.mock('@/services/baseCurrencyService', () => ({
  changeBaseCurrency: vi.fn(),
}));
vi.mock('@/utils/auth', () => ({
  clearAuthCookie: vi.fn(),
}));

// Note: bcrypt is imported normally (not mocked) so tests can use real hash/compare
// Import after all mocks are set up
import bcrypt from 'bcrypt';
import userController from '@/controllers/userController';
import User from '@/models/user';
import { clearAuthCookie } from '@/utils/auth';

const mockRequest = (body: Record<string, any> = {}) =>
  ({
    user: { userId: 'user-123' },
    body,
    params: {},
    query: {},
  }) as unknown as Request;

const mockResponse = () => {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe('userController self-scoped endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateProfile', () => {
    it('以 token 身分更新 name，body 夾帶 userId 不影響對象', async () => {
      const instance = { update: vi.fn().mockResolvedValue(undefined) };
      (User.findByPk as any).mockResolvedValue(instance);

      const req = mockRequest({ name: '新名字', userId: 'attacker-999' });
      const res = mockResponse();
      await userController.updateProfile(req, res);

      expect(User.findByPk).toHaveBeenCalledWith('user-123');
      expect(instance.update).toHaveBeenCalledWith({ name: '新名字' });
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ isSuccess: true, data: { name: '新名字' } }),
      );
    });

    it('找不到使用者回 404', async () => {
      (User.findByPk as any).mockResolvedValue(null);

      const req = mockRequest({ name: '新名字' });
      const res = mockResponse();
      await userController.updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
    });
  });

  describe('changePassword', () => {
    it('目前密碼錯誤回 400，不更新', async () => {
      const instance = {
        password: await bcrypt.hash('correct-old-pw', 4),
        tokenVersion: 5,
        update: vi.fn().mockResolvedValue(undefined),
      };
      (User.findByPk as any).mockResolvedValue(instance);

      const req = mockRequest({
        currentPassword: 'wrong-pw',
        newPassword: 'NewPassword123',
      });
      const res = mockResponse();
      await userController.changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ isSuccess: false, message: '目前密碼不正確' }),
      );
      expect(instance.update).not.toHaveBeenCalled();
    });

    it('目前密碼正確：更新為新 hash 且 tokenVersion +1', async () => {
      const instance = {
        password: await bcrypt.hash('correct-old-pw', 4),
        tokenVersion: 5,
        update: vi.fn().mockResolvedValue(undefined),
      };
      (User.findByPk as any).mockResolvedValue(instance);

      const req = mockRequest({
        currentPassword: 'correct-old-pw',
        newPassword: 'NewPassword123',
      });
      const res = mockResponse();
      await userController.changePassword(req, res);

      expect(instance.update).toHaveBeenCalledTimes(1);
      const arg = (instance.update as any).mock.calls[0][0];
      expect(arg.tokenVersion).toBe(6);
      expect(await bcrypt.compare('NewPassword123', arg.password)).toBe(true);
      expect(clearAuthCookie).toHaveBeenCalledWith(req, res);
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });
  });

  describe('deleteMe', () => {
    it('soft-delete token 使用者（包在 transaction 內）並清除 auth cookies', async () => {
      const instance = { destroy: vi.fn().mockResolvedValue(undefined) };
      (User.findByPk as any).mockResolvedValue(instance);

      const req = mockRequest();
      const res = mockResponse();
      await userController.deleteMe(req, res);

      expect(User.findByPk).toHaveBeenCalledWith('user-123');
      expect(instance.destroy).toHaveBeenCalledTimes(1);
      expect(instance.destroy).toHaveBeenCalledWith(
        expect.objectContaining({ transaction: expect.anything() }),
      );
      expect(clearAuthCookie).toHaveBeenCalledWith(req, res);
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ isSuccess: true, message: '帳號已刪除' }),
      );
    });
  });
});
