import { Account } from '../constants';

export interface CreditCardDetailType {
  id: string;
  accountId: string;
  statementDate: number;
  paymentDueDate: number;
  gracePeriod: number;
  interestRate?: number;
  creditLimit: number;
  includeInTotal: boolean;
}

export interface AccountType {
  id: string;
  userId: string;
  name: string;
  type: Account;
  balance: number;
  // 帳戶幣別（帳戶內所有交易的計價幣別），預設 'TWD'
  currencyCode: string;
  icon: string;
  color: string;
  isArchived: boolean;
  creditCardDetail?: CreditCardDetailType;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export type CreditAccountType = AccountType & {
  creditCardDetail: CreditCardDetailType;
};
