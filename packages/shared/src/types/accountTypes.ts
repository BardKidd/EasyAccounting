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
