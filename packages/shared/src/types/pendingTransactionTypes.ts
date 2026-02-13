import { TransactionType } from './transactionTypes';
import { PendingTransactionStatus } from '../constants';

export interface PendingTransaction {
  id: string;
  userId: string;
  uploadBatchId: string;
  rawMerchantName: string;
  suggestedCategoryId: string | null;
  matchedTransactionId: string | null;
  isInstallment: boolean;
  installmentNumber: number | null;
  status: PendingTransactionStatus;
  transactionData: {
    amount: number;
    type: TransactionType;
    description: string;
    date: string; // YYYY-MM-DD
    time: string | null; // HH:mm:ss
    accountId: string | null;
    categoryId: string | null;
    extraAdd: number;
    extraMinus: number;
    currency: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PendingTransactionUpdatePayload {
  status?: PendingTransactionStatus;
  transactionData?: Partial<PendingTransaction['transactionData']>;
}
