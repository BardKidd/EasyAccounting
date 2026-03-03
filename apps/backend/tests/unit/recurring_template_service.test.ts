import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecurringFrequency, RecurringTemplateStatus } from '@repo/shared';

// ---------------------------------------------------------------------------
// Mock all models
// ---------------------------------------------------------------------------
vi.mock('@/models', () => {
  const RecurringTemplateMock = {
    create: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    destroy: vi.fn(),
  };
  const TransactionMock = {
    create: vi.fn(),
    findOne: vi.fn(),
    destroy: vi.fn(),
  };
  const AccountMock = {
    findByPk: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn(),
  };
  const TransactionExtraMock = {
    create: vi.fn(),
    destroy: vi.fn(),
  };
  return {
    RecurringTemplate: RecurringTemplateMock,
    Transaction: TransactionMock,
    Account: AccountMock,
    TransactionExtra: TransactionExtraMock,
  };
});

vi.mock('@/utils/postgres', () => ({
  default: {
    transaction: vi.fn((cb) => {
      const t = { commit: vi.fn(), rollback: vi.fn() };
      if (typeof cb === 'function') return cb(t);
      return Promise.resolve(t);
    }),
    literal: vi.fn((v) => v),
  },
  TABLE_DEFAULT_SETTING: {},
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import {
  calcNextExecutionDate,
  processRecurringTemplates,
} from '../../src/services/recurringTemplateService';
import {
  RecurringTemplate,
  Transaction,
  Account,
  TransactionExtra,
} from '@/models';

describe('calcNextExecutionDate', () => {
  it('MONTHLY 正常月份', () => {
    const result = calcNextExecutionDate(
      new Date('2025-01-15'),
      RecurringFrequency.MONTHLY,
      { dayOfMonth: 15 },
    );
    expect(result).toBe('2025-02-15');
  });

  it('MONTHLY 月底邊界：1/31 → 2/28（非閏年）', () => {
    const result = calcNextExecutionDate(
      new Date('2025-01-31'),
      RecurringFrequency.MONTHLY,
      { dayOfMonth: 31 },
    );
    expect(result).toBe('2025-02-28');
  });

  it('MONTHLY 月底邊界：1/31 → 2/29（閏年 2024）', () => {
    const result = calcNextExecutionDate(
      new Date('2024-01-31'),
      RecurringFrequency.MONTHLY,
      { dayOfMonth: 31 },
    );
    expect(result).toBe('2024-02-29');
  });

  it('MONTHLY 月底邊界恢復：2/28 下一個月應回到 3/31', () => {
    const result = calcNextExecutionDate(
      new Date('2025-02-28'),
      RecurringFrequency.MONTHLY,
      { dayOfMonth: 31 }, // 原始設定 31 號
    );
    expect(result).toBe('2025-03-31');
  });

  it('WEEKLY 正常', () => {
    const result = calcNextExecutionDate(
      new Date('2025-01-01'),
      RecurringFrequency.WEEKLY,
      {},
    );
    expect(result).toBe('2025-01-08');
  });

  it('YEARLY 正常', () => {
    const result = calcNextExecutionDate(
      new Date('2025-03-01'),
      RecurringFrequency.YEARLY,
      { monthDay: '03-01' },
    );
    expect(result).toBe('2026-03-01');
  });

  it('YEARLY 月底邊界：閏年 2/29 → 隔年 2/28', () => {
    const result = calcNextExecutionDate(
      new Date('2024-02-29'),
      RecurringFrequency.YEARLY,
      { monthDay: '02-29' },
    );
    expect(result).toBe('2025-02-28');
  });
});

describe('processRecurringTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('找到到期 ACTIVE template 時應建立 Transaction 並更新 template', async () => {
    const mockTemplate = {
      id: 'tpl-1',
      userId: 'user-1',
      baseTransactionAttrs: {
        accountId: 'acc-1',
        categoryId: 'cat-1',
        amount: 149,
        type: 'EXPENSE',
        description: 'Spotify',
        receipt: null,
        paymentFrequency: 'RECURRING',
        extraAdd: 0,
        extraMinus: 0,
      },
      frequency: RecurringFrequency.MONTHLY,
      dayOfMonth: 1,
      dayOfWeek: null,
      monthDay: null,
      totalOccurrences: 6,
      currentOccurrence: 0,
      nextExecutionDate: '2025-01-01',
      status: RecurringTemplateStatus.ACTIVE,
      update: vi.fn().mockResolvedValue(undefined),
    };

    (RecurringTemplate.findAll as any).mockResolvedValue([mockTemplate]);
    (Transaction.create as any).mockResolvedValue({ id: 'tx-1' });
    (Account.findByPk as any).mockResolvedValue({
      id: 'acc-1',
      balance: 1000,
      save: vi.fn(),
    });

    await processRecurringTemplates();

    expect(Transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        accountId: 'acc-1',
        amount: 149,
        recurringTemplateId: 'tpl-1',
        recurringSequence: 1,
      }),
      expect.anything(),
    );

    expect(mockTemplate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        currentOccurrence: 1,
        status: RecurringTemplateStatus.ACTIVE,
      }),
      expect.anything(),
    );
  });

  it('最後一筆執行後應將 template 設為 COMPLETED', async () => {
    const mockTemplate = {
      id: 'tpl-2',
      userId: 'user-1',
      baseTransactionAttrs: {
        accountId: 'acc-1',
        categoryId: 'cat-1',
        amount: 100,
        type: 'EXPENSE',
        description: null,
        receipt: null,
        paymentFrequency: 'RECURRING',
        extraAdd: 0,
        extraMinus: 0,
      },
      frequency: RecurringFrequency.MONTHLY,
      dayOfMonth: 1,
      dayOfWeek: null,
      monthDay: null,
      totalOccurrences: 3,
      currentOccurrence: 2, // 已執行 2 次，這次是第 3 次（最後）
      nextExecutionDate: '2025-03-01',
      status: RecurringTemplateStatus.ACTIVE,
      update: vi.fn().mockResolvedValue(undefined),
    };

    (RecurringTemplate.findAll as any).mockResolvedValue([mockTemplate]);
    (Transaction.create as any).mockResolvedValue({ id: 'tx-2' });
    (Account.findByPk as any).mockResolvedValue({
      id: 'acc-1',
      balance: 1000,
      save: vi.fn(),
    });

    await processRecurringTemplates();

    expect(mockTemplate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        currentOccurrence: 3,
        status: RecurringTemplateStatus.COMPLETED,
      }),
      expect.anything(),
    );
  });
});
