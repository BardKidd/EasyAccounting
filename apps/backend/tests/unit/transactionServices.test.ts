import { describe, it, expect, vi, beforeEach } from 'vitest';
import transactionServices from '@/services/transactionServices';
import { Account, Transaction } from '@/models';
import sequelize from '@/utils/postgres';
import { RootType } from '@repo/shared';

// Mock Dependencies
vi.mock('@/models', () => ({
  Account: {
    findByPk: vi.fn(),
  },
  Transaction: {
    create: vi.fn(),
  },
  InstallmentPlan: {
    create: vi.fn(),
  },
}));

vi.mock('@/utils/postgres', () => ({
  default: {
    transaction: vi.fn((cb) => cb('mock_transaction')), // Immediately execute callback
  },
}));

describe('Transaction Services Unit Test', () => {
  const mockUserId = 'user_123';
  const mockFromAccountId = 'account_A';
  const mockToAccountId = 'account_B';
  const mockDate = '2026-01-15';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTransfer', () => {
    it('should successfully create two transactions and update balances correctly', async () => {
      // 1. Arrange (Prepare Mocks)
      const transferData = {
        accountId: mockFromAccountId,
        targetAccountId: mockToAccountId,
        amount: 100,
        date: mockDate,
        time: '12:00',
        type: RootType.OPERATE,
        description: 'Test Transfer',
        categoryId: 'cat_1',
        paymentFrequency: 'ONE_TIME' as any,
        receipt: null,
      };

      // Mock Account Instances
      const mockFromAccount = {
        id: mockFromAccountId,
        balance: 1000,
        save: vi.fn(),
      };
      const mockToAccount = {
        id: mockToAccountId,
        balance: 500,
        save: vi.fn(),
      };

      vi.mocked(Account.findByPk).mockImplementation(async (id: any) => {
        if (id === mockFromAccountId) return mockFromAccount as any;
        if (id === mockToAccountId) return mockToAccount as any;
        return null;
      });

      // Mock Transaction Instances
      const mockFromTx = {
        id: 'tx_from_1',
        update: vi.fn(),
        toJSON: () => ({ id: 'tx_from_1', type: RootType.EXPENSE }),
      };
      const mockToTx = {
        id: 'tx_to_1',
        update: vi.fn(),
        toJSON: () => ({ id: 'tx_to_1', type: RootType.INCOME }),
      };

      vi.mocked(Transaction.create)
        .mockResolvedValueOnce(mockFromTx as any) // First call: From Transaction
        .mockResolvedValueOnce(mockToTx as any); // Second call: To Transaction

      // 2. Act
      const result = await transactionServices.createTransfer(transferData, mockUserId);

      // 3. Assert

      // Verify Accounts retrieved
      expect(Account.findByPk).toHaveBeenCalledWith(mockFromAccountId, expect.anything());
      expect(Account.findByPk).toHaveBeenCalledWith(mockToAccountId, expect.anything());

      // Verify Transactions created
      expect(Transaction.create).toHaveBeenCalledTimes(2);
      
      // Verify Balances Updated
      // FromAccount: 1000 - 100 = 900
      expect(mockFromAccount.balance).toBe(900);
      expect(mockFromAccount.save).toHaveBeenCalled();

      // ToAccount: 500 + 100 = 600
      expect(mockToAccount.balance).toBe(600);
      expect(mockToAccount.save).toHaveBeenCalled();

      // Verify Link IDs updated
      expect(mockFromTx.update).toHaveBeenCalledWith(
        expect.objectContaining({ linkId: 'tx_to_1' }),
        expect.anything()
      );
      expect(mockToTx.update).toHaveBeenCalledWith(
        expect.objectContaining({ linkId: 'tx_from_1' }),
        expect.anything()
      );

      // Verify Result
      expect(result.fromTransaction.id).toBe('tx_from_1');
      expect(result.toTransaction.id).toBe('tx_to_1');
    });

    it('should throw error if transfer type is not OPERATE', async () => {
      const invalidData = {
          accountId: mockFromAccountId,
          targetAccountId: mockToAccountId,
          amount: 100,
          date: mockDate,
          time: '12:00',
          type: RootType.EXPENSE, // Wrong Type
          description: 'Invalid Transfer',
          categoryId: 'cat_1',
          paymentFrequency: 'ONE_TIME' as any,
          receipt: null,
      };

      await expect(transactionServices.createTransfer(invalidData as any, mockUserId))
        .rejects
        .toThrow('Must be operate type');
    });

    it('should throw error if accounts not found', async () => {
       const transferData = {
        accountId: 'non_existent',
        targetAccountId: mockToAccountId,
        amount: 100,
        date: mockDate,
        time: '12:00',
        type: RootType.OPERATE,
        description: 'Test Transfer',
        categoryId: 'cat_1',
        paymentFrequency: 'ONE_TIME' as any,
        receipt: null,
      };

       vi.mocked(Account.findByPk).mockResolvedValue(null);

       await expect(transactionServices.createTransfer(transferData, mockUserId))
        .rejects
        .toThrow('From account not found');
    });
  });
});
