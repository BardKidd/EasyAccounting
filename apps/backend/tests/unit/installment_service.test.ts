import { describe, it, expect, vi, beforeEach } from 'vitest';
import transactionServices from '@/services/transactionServices';
import Transaction from '@/models/transaction';
import InstallmentPlan from '@/models/InstallmentPlan';
import Account from '@/models/account';
import { RootType, CalculationMethod, RemainderPlacement } from '@repo/shared';

// Mock models
vi.mock('@/models/transaction', () => ({
  default: {
    create: vi.fn(),
    findOne: vi.fn(),
    belongsTo: vi.fn(),
    hasMany: vi.fn(),
    hasOne: vi.fn(),
  },
}));

vi.mock('@/models/InstallmentPlan', () => ({
  default: {
    create: vi.fn(),
    belongsTo: vi.fn(),
    hasMany: vi.fn(),
    hasOne: vi.fn(),
  },
}));

vi.mock('@/models/account', () => ({
  default: {
    findByPk: vi.fn(),
    belongsTo: vi.fn(),
    hasMany: vi.fn(),
    hasOne: vi.fn(),
  },
}));

// Mock Sequelize Transaction
vi.mock('@/utils/postgres', () => {
  const mTransaction = {
    commit: vi.fn(),
    rollback: vi.fn(),
  };
  return {
    default: {
      transaction: vi.fn((cb) => {
        if (cb) return cb(mTransaction);
        return mTransaction;
      }),
      define: vi.fn(() => ({
        belongsTo: vi.fn(),
        hasMany: vi.fn(),
        hasOne: vi.fn(),
      })),
    },
    TABLE_DEFAULT_SETTING: {},
  };
});

vi.mock('@/models/TransactionExtra', () => ({
  default: {
    create: vi.fn(),
    findOne: vi.fn(),
    belongsTo: vi.fn(),
    hasMany: vi.fn(),
    hasOne: vi.fn(),
  },
}));

vi.mock('@/models/category', () => ({
  default: {
    findByPk: vi.fn(),
    findOne: vi.fn(),
    belongsTo: vi.fn(),
    hasMany: vi.fn(),
    hasOne: vi.fn(),
  },
}));

describe('Installment Service', () => {
  const mockUser = { userId: 'user-1' };
  const mockAccount = {
    id: 'acc-1',
    balance: 1000,
    save: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (Account.findByPk as any).mockResolvedValue(mockAccount);
    (InstallmentPlan.create as any).mockResolvedValue({ id: 'inst-1' });
    (Transaction.create as any).mockResolvedValue({
      id: 'tx-i',
      toJSON: () => ({}),
    });
  });

  describe('Installment Calculation', () => {
    it('should split amount correctly using Rounding and Remainder First', async () => {
      // Total 100, 3 installments.
      // 33.33 -> Round -> 33.
      // Total calc = 99. Remainder 1.
      // First: 33+1 = 34. Middle: 33. Last: 33.

      await transactionServices.createTransaction(
        {
          amount: 100,
          accountId: 'acc-1',
          date: '2023-01-01',
          type: RootType.EXPENSE,
          installment: {
            totalInstallments: 3,
            calculationMethod: CalculationMethod.ROUND,
            remainderPlacement: RemainderPlacement.FIRST,
          },
        } as any,
        mockUser.userId
      );

      expect(InstallmentPlan.create).toHaveBeenCalled();

      // Should create 3 transactions
      expect(Transaction.create).toHaveBeenCalledTimes(3);

      // Check specific calls
      // 1st
      expect(Transaction.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          amount: 34,
          description: expect.stringContaining('(1/3)'),
        }),
        expect.anything()
      );

      // 2nd
      expect(Transaction.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          amount: 33,
          description: expect.stringContaining('(2/3)'),
        }),
        expect.anything()
      );

      // 3rd
      expect(Transaction.create).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          amount: 33,
          description: expect.stringContaining('(3/3)'),
        }),
        expect.anything()
      );

      // Check Account Balance Update (Total Amount)
      // 1000 - 100 = 900
      expect(mockAccount.balance).toBe(900);
    });

    it('should split amount correctly using Floor and Remainder Last', async () => {
      // Total 100, 3 installments.
      // 33.33 -> Floor -> 33.
      // Total calc = 99. Remainder 1.
      // First: 33. Middle: 33. Last: 33+1=34.

      await transactionServices.createTransaction(
        {
          amount: 100,
          accountId: 'acc-1',
          date: '2023-01-01',
          type: RootType.EXPENSE,
          installment: {
            totalInstallments: 3,
            calculationMethod: CalculationMethod.FLOOR,
            remainderPlacement: RemainderPlacement.LAST,
          },
        } as any,
        mockUser.userId
      );

      // 1st
      expect(Transaction.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          amount: 33,
        }),
        expect.anything()
      );

      // 3rd
      expect(Transaction.create).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          amount: 34,
        }),
        expect.anything()
      );
    });
  });
});
