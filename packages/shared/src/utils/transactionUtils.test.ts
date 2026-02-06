import { describe, it, expect } from 'vitest';
import { isOperateTransaction, isOutgoingTransfer, isIncomingTransfer } from './transactionUtils';
import { RootType, TransactionType } from '..';

describe('transactionUtils', () => {
  describe('isOperateTransaction', () => {
    it('should return true when targetAccountId exists', () => {
      const tx = { targetAccountId: 'acc-123', type: RootType.EXPENSE } as TransactionType;
      expect(isOperateTransaction(tx)).toBe(true);
    });

    it('should return false when targetAccountId is null', () => {
      const tx = { targetAccountId: null, type: RootType.EXPENSE } as TransactionType;
      expect(isOperateTransaction(tx)).toBe(false);
    });
  });

  describe('isOutgoingTransfer', () => {
    it('should return true for EXPENSE with targetAccountId', () => {
      const tx = { targetAccountId: 'acc-123', type: RootType.EXPENSE } as TransactionType;
      expect(isOutgoingTransfer(tx)).toBe(true);
    });

    it('should return false for INCOME with targetAccountId', () => {
      const tx = { targetAccountId: 'acc-123', type: RootType.INCOME } as TransactionType;
      expect(isOutgoingTransfer(tx)).toBe(false);
    });
  });

    describe('isIncomingTransfer', () => {
    it('should return true for INCOME with targetAccountId', () => {
      const tx = { targetAccountId: 'acc-123', type: RootType.INCOME } as TransactionType;
      expect(isIncomingTransfer(tx)).toBe(true);
    });

    it('should return false for EXPENSE with targetAccountId', () => {
      const tx = { targetAccountId: 'acc-123', type: RootType.EXPENSE } as TransactionType;
      expect(isIncomingTransfer(tx)).toBe(false);
    });
  });
});
