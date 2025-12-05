import { MainType, PaymentFrequency } from '../constants';

export interface TransactionType {
  userId: string;
  accountId: string;
  categoryId: string;
  amount: number;
  type: MainType;
  description: string | null;
  date: string;
  time: string;
  receipt: string | null;
  paymentFrequency: PaymentFrequency;
  // 系統自動產生
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface TransactionTypeWhenOperate extends TransactionType {
  targetAccountId: string;
}
