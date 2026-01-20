import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RootType } from '@repo/shared';

// Mock @/models as a whole to avoid models/index.ts executing User.addHook
// All mock objects MUST be defined inside factory due to vi.mock hoisting
vi.mock('@/models', () => ({
  Transaction: {
    create: vi.fn(),
    findOne: vi.fn(),
    belongsTo: vi.fn(),
    hasMany: vi.fn(),
    hasOne: vi.fn(),
  },
  TransactionExtra: {
    create: vi.fn(),
    findOne: vi.fn(),
    belongsTo: vi.fn(),
    hasMany: vi.fn(),
    hasOne: vi.fn(),
  },
  Account: {
    findByPk: vi.fn(),
    findOne: vi.fn(),
    belongsTo: vi.fn(),
    hasMany: vi.fn(),
    hasOne: vi.fn(),
  },
  InstallmentPlan: {
    create: vi.fn(),
    belongsTo: vi.fn(),
    hasMany: vi.fn(),
    hasOne: vi.fn(),
  },
  Category: {
    findByPk: vi.fn(),
    findOne: vi.fn(),
    belongsTo: vi.fn(),
    hasMany: vi.fn(),
    hasOne: vi.fn(),
  },
  TransactionBudget: { create: vi.fn(), destroy: vi.fn() },
}));

// Mock Sequelize Transaction
vi.mock('@/utils/postgres', () => ({
  default: {
    transaction: vi.fn((cb) => {
      const mTransaction = { commit: vi.fn(), rollback: vi.fn() };
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
}));

import transactionServices from '@/services/transactionServices';
import { Transaction, TransactionExtra, Account } from '@/models';

describe('Transaction Service Scenarios', () => {
  const mockUser = { userId: 'user-1' };
  const mockAccount = {
    id: 'acc-1',
    balance: 1000,
    save: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Zero Amount Logic', () => {
    it('should allow transaction with amount 0', async () => {
      (Account.findByPk as any).mockResolvedValue(mockAccount);
      (Transaction.create as any).mockResolvedValue({
        id: 'tx-0',
        amount: 0,
        toJSON: () => ({ id: 'tx-0', amount: 0 }),
      });

      const result = await transactionServices.createTransaction(
        {
          amount: 0,
          accountId: 'acc-1',
          date: '2023-01-01',
          type: RootType.EXPENSE,
          category: 'Food',
        } as any,
        mockUser.userId,
      );

      expect(Transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 0 }),
        expect.anything(),
      );
      expect(result).toEqual(expect.objectContaining({ amount: 0 }));
    });
  });

  describe('Extra Amount Logic (Fee & Discount)', () => {
    it('should calculate net amount correctly for Expense with Fee and Discount', async () => {
      // Expense: Original 100 + Fee 10 - Discount 5 = Net 105 deduction
      (Account.findByPk as any).mockResolvedValue(mockAccount);
      (TransactionExtra.create as any).mockResolvedValue({ id: 'ext-1' });
      (Transaction.create as any).mockResolvedValue({
        id: 'tx-1',
        amount: 100,
        toJSON: () => ({ id: 'tx-1', amount: 100 }),
      });

      await transactionServices.createTransaction(
        {
          amount: 100,
          accountId: 'acc-1',
          type: RootType.EXPENSE,
          date: '2023-01-01',
          extraAdd: 5, // Discount (Good)
          extraMinus: 10, // Fee (Bad)
        } as any,
        mockUser.userId,
      );

      expect(TransactionExtra.create).toHaveBeenCalledWith(
        expect.objectContaining({ extraAdd: 5, extraMinus: 10 }),
        expect.anything(),
      );
      // Verify account balance update: 1000 - (100 + 10 - 5) = 895
      expect(mockAccount.balance).toBe(895);
      expect(mockAccount.save).toHaveBeenCalled();
    });

    it('should calculate net amount correctly for Income with Bonus and Cost', async () => {
      // Income: Original 100 + Bonus 10 - Cost 5 = Net 105 addition
      const incomeAcc = { ...mockAccount, balance: 1000, save: vi.fn() };
      (Account.findByPk as any).mockResolvedValue(incomeAcc);
      (TransactionExtra.create as any).mockResolvedValue({ id: 'ext-2' });
      (Transaction.create as any).mockResolvedValue({ toJSON: () => ({}) });

      await transactionServices.createTransaction(
        {
          amount: 100,
          accountId: 'acc-1',
          type: RootType.INCOME,
          date: '2023-01-01',
          extraAdd: 10, // Bonus/Tip
          extraMinus: 5, // Cost/Fee
        } as any,
        mockUser.userId,
      );

      // Verify account balance update: 1000 + (100 + 10 - 5) = 1105
      expect(incomeAcc.balance).toBe(1105);
    });
  });

  describe('Transfer Logic', () => {
    it('should create two transactions and update balances correctly', async () => {
      const fromAcc = { id: 'acc-1', balance: 1000, save: vi.fn() };
      const toAcc = { id: 'acc-2', balance: 500, save: vi.fn() };

      (Account.findByPk as any)
        .mockResolvedValueOnce(fromAcc) // First call for fromAccount
        .mockResolvedValueOnce(toAcc); // Second call for toAccount

      const mockFromTx = {
        id: 'tx-from',
        update: vi.fn(),
        toJSON: () => ({ id: 'tx-from' }),
      };
      const mockToTx = {
        id: 'tx-to',
        update: vi.fn(),
        toJSON: () => ({ id: 'tx-to' }),
      };

      (Transaction.create as any)
        .mockResolvedValueOnce(mockFromTx)
        .mockResolvedValueOnce(mockToTx);

      // Transfer 100 from acc-1 to acc-2 with fee 10
      await transactionServices.createTransfer(
        {
          amount: 100,
          accountId: 'acc-1',
          targetAccountId: 'acc-2',
          date: '2023-01-01',
          type: RootType.OPERATE, // or EXPENSE, but typically handled as OPERATE in service wrapper
          extraMinus: 10, // Fee (Bad) -> extraMinus
        } as any,
        mockUser.userId,
      );

      // Check Balances
      // From: 1000 - 100 - 10 = 890
      expect(fromAcc.balance).toBe(890);
      // To: 500 + 100 = 600
      expect(toAcc.balance).toBe(600);

      // Check LinkId updates
      expect(mockFromTx.update).toHaveBeenCalledWith(
        expect.objectContaining({ linkId: 'tx-to' }),
        expect.anything(),
      );
      expect(mockToTx.update).toHaveBeenCalledWith(
        expect.objectContaining({ linkId: 'tx-from' }),
        expect.anything(),
      );
    });
  });
});
