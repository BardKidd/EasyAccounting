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
}

export interface TransactionTypeWhenOperate extends TransactionType {
  targetAccountId: string;
}

export interface TransactionResponse {
  items: TransactionType[];
  pagination: TransactionPagination;
}
export interface TransactionPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
