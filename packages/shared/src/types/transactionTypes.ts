import {
  RootType,
  PaymentFrequency,
  InterestType,
  CalculationMethod,
  RemainderPlacement,
  RewardsType,
  RecurringFrequency,
  RecurringTemplateStatus,
} from '../constants';
import type { TransactionTagBrief } from './tagTypes';

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

export interface TransactionExtraType {
  id: string;
  extraAdd: number;
  extraAddLabel: string;
  extraMinus: number;
  extraMinusLabel: string;
  // 本位幣快照（model hook 由 extraAdd/extraMinus × 交易 baseRate 算出；單幣時 = 原值）
  extraAddInBase?: number;
  extraMinusInBase?: number;
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

  // 多幣別欄位（金額語意見 docs/multicurrency-implementation-plan.md §金額語意）
  // amountInBase = amount × baseRate（本位幣快照），由 model hook 自動算出，呼叫端勿手動設
  amountInBase?: number;
  originalCurrencyCode?: string | null; // 原幣代碼（選填，記錄「我實際刷了 100 JPY」）
  originalAmount?: number | null; // 原幣金額（選填）
  exchangeRate?: number | null; // 原幣 → 帳戶幣別 匯率快照
  baseRate?: number | null; // 帳戶幣別 → 本位幣 匯率快照（單幣時 = 1）

  // New fields
  billingDate?: string;
  installmentPlanId?: string | null;
  isReconciled?: boolean;
  reconciliationDate?: Date | string | null;
  transactionExtraId?: string | null;
  transactionExtra?: TransactionExtraType | null;

  // Recurring fields
  recurringTemplateId?: string | null;
  recurringSequence?: number | null;

  // 標籤（多對多；getTransactionsByDate / getTransactionById 回應夾帶）
  tags?: TransactionTagBrief[];
}

export interface RecurringTemplateType {
  id: string;
  userId: string;
  baseTransactionAttrs: {
    accountId: string;
    categoryId: string;
    amount: number;
    type: RootType;
    description: string | null;
    receipt: string | null;
    paymentFrequency: PaymentFrequency;
    extraAdd?: number;
    extraAddLabel?: string;
    extraMinus?: number;
    extraMinusLabel?: string;
    time?: string;
  };
  frequency: RecurringFrequency;
  dayOfMonth?: number | null;
  dayOfWeek?: number | null;
  monthDay?: string | null;
  totalOccurrences: number | null;
  currentOccurrence: number;
  nextExecutionDate: string;
  status: RecurringTemplateStatus;
  createdAt?: string;
  updatedAt?: string;
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
