import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runGuestCleanupJob } from '@/cron/guestCleanupCron';
import User from '@/models/user';
import { Op } from 'sequelize';

// ─── Hoisted mock helpers ───
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

// ─── Mock Models ───
vi.mock('@/models/user', () => ({ default: createMockModel() }));
vi.mock('@/models/account', () => ({ default: createMockModel() }));
vi.mock('@/models/transaction', () => ({ default: createMockModel() }));
vi.mock('@/models/TransactionExtra', () => ({ default: createMockModel() }));
vi.mock('@/models/category', () => ({ default: createMockModel() }));
vi.mock('@/models/budget', () => ({ default: createMockModel() }));
vi.mock('@/models/installmentPlan', () => ({ default: createMockModel() }));
vi.mock('@/models/installmentDetail', () => ({ default: createMockModel() }));
vi.mock('@/models/RecurringTemplate', () => ({ default: createMockModel() }));
vi.mock('@/models/CreditCardDetail', () => ({ default: createMockModel() }));

// ─── Mock Sequelize ───
const mockSequelizeTransaction = vi.fn();
vi.mock('@/utils/postgres', () => ({
  default: {
    transaction: (...args: any[]) => mockSequelizeTransaction(...args),
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

// ─── Mock node-cron (避免真的註冊 cron) ───
vi.mock('node-cron', () => ({
  default: {
    schedule: vi.fn(),
  },
}));

// ─── Tests ───
describe('Guest Cleanup Cron Job (Task 4.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should find stale guests (isGuest=true, lastActivityAt > 30 days) and destroy each in a transaction', async () => {
    const staleGuest1 = {
      id: 'stale-1',
      destroy: vi.fn().mockResolvedValue(undefined),
    };
    const staleGuest2 = {
      id: 'stale-2',
      destroy: vi.fn().mockResolvedValue(undefined),
    };

    (User.findAll as any).mockResolvedValue([staleGuest1, staleGuest2]);

    // 模擬 sequelize.transaction 執行 callback
    mockSequelizeTransaction.mockImplementation(async (cb: any) => {
      const fakeTx = {};
      return cb(fakeTx);
    });

    await runGuestCleanupJob();

    // 驗證 findAll 查詢條件正確
    expect(User.findAll).toHaveBeenCalledWith({
      where: {
        isGuest: true,
        lastActivityAt: {
          [Op.lt]: expect.any(Date),
        },
      },
    });

    // 驗證 30 天前的日期計算
    const callArgs = (User.findAll as any).mock.calls[0][0];
    const cutoffDate = callArgs.where.lastActivityAt[Op.lt] as Date;
    const now = new Date();
    const diffDays =
      (now.getTime() - cutoffDate.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThanOrEqual(29.9);
    expect(diffDays).toBeLessThanOrEqual(30.1);

    // 驗證每個 guest 都在 transaction 中被 destroy
    expect(staleGuest1.destroy).toHaveBeenCalledWith(
      expect.objectContaining({ transaction: expect.anything() }),
    );
    expect(staleGuest2.destroy).toHaveBeenCalledWith(
      expect.objectContaining({ transaction: expect.anything() }),
    );

    // 驗證 sequelize.transaction 被呼叫了 2 次（每個 guest 一次）
    expect(mockSequelizeTransaction).toHaveBeenCalledTimes(2);
  });

  it('should do nothing when no stale guests are found', async () => {
    (User.findAll as any).mockResolvedValue([]);

    await runGuestCleanupJob();

    expect(User.findAll).toHaveBeenCalled();
    expect(mockSequelizeTransaction).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully without throwing', async () => {
    (User.findAll as any).mockRejectedValue(new Error('DB connection failed'));

    // 不應拋出
    await expect(runGuestCleanupJob()).resolves.not.toThrow();
  });
});
