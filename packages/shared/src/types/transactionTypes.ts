import { RootType, PaymentFrequency } from '../constants';

export interface TransactionType {
  userId: string;
  accountId: string;
  categoryId: string;
  amount: number;
  type: RootType;
  description: string | null;
  date: string;
  time: string;
  receipt: string | null;
  paymentFrequency: PaymentFrequency;
  // 系統自動產生
  id?: string;
  targetAccountId?: string | null;
  linkId?: string | null;
}

export interface TransactionTypeWhenOperate extends TransactionType {
  linkId: string;
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
