import { RootType } from '../constants';
import { TransactionExtraType } from './transactionTypes';

export interface OverviewTrendType {
  income: number;
  expense: number;
  transferIn: number;
  transferOut: number;
  balance: number;
}

export interface OverviewTop3CategoriesType {
  categoryId: string;
  amount: number;
  category: {
    name: string;
    color: string | null;
    icon: string;
    id: string;
  };
}

export interface OverviewTop3ExpensesType {
  categoryId: string;
  amount: number;
  id: string;
  date: string;
  description: string;
  category: {
    name: string;
    icon: string;
    id: string;
  };
}

export interface DetailTabDataType {
  id: string;
  amount: number;
  date: string;
  time: string;
  description: string;
  type: RootType.EXPENSE | RootType.INCOME;
  targetAccountId: string | null;
  category: {
    id: string;
    name: string;
    color: string | null;
    icon: string;
  };
  account: {
    name: string;
  };
  targetAccount: {
    name: string;
  };
}

// 明細列表顯示用
export interface DetailsTransaction {
  id: string;
  date: string;
  amount: number;
  type: RootType;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  description: string;
  accountName: string;
  targetAccountName?: string;
  transactionExtra?: TransactionExtraType | null;
}

// 類別 API 回覆欄位
export interface CategoryTabDataType {
  id: string;
  name: string;
  icon: string;
  color: string;
  count: number;
  amount: number;
  type: RootType;
  isTransfer: boolean;
}

export interface RankingTabDataType {
  id: string;
  type: RootType;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  description: string;
  accountName: string;
  amount: number;
  isTransfer: boolean;
}

export interface AccountTabDataType {
  id: string;
  name: string;
  icon: string;
  color: string;
  amount: number;
  count: number;
  isTransfer: boolean;
  type: RootType;
}

export interface EachMonthNetFlow {
  year: string;
  month: string;
  income: number;
  expense: number;
  netFlow: number;
}
export interface FinalResult extends EachMonthNetFlow {
  balance: number;
}
