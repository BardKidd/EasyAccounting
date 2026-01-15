import {
  RootType,
  PaymentFrequency,
  InterestType,
  CalculationMethod,
  RemainderPlacement,
  RewardsType,
} from '../constants';

export interface InstallmentPlanType {
  id: string;
  userId: string;
  totalAmount: number;
  totalInstallments: number;
  startDate: string;
  description: string | null;
  interestType: InterestType;
  calculationMethod: CalculationMethod;
  remainderPlacement: RemainderPlacement;
  gracePeriod: number;
  rewardsType: RewardsType;
}

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

  // New fields
  billingDate?: string;
  installmentPlanId?: string | null;
  isReconciled?: boolean;
  reconciliationDate?: Date | string | null;
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
