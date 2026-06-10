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

// 資產趨勢回傳：trend 為每月序列；hasMultiCurrency 為「使用者持有非本位幣帳戶」旗標。
// 多幣別時趨勢圖起點用今日匯率（mark-to-market 現值，對齊淨值卡），歷史月份 netFlow
// 用交易當下快照匯率（amountInBase，符合 D1 歷史不被未來匯率污染）——兩者口徑不同，
// 故歷史資產曲線在多幣別下為近似值。旗標供前端標註；單幣時恆 false、曲線精確。
export interface AssetTrendResult {
  trend: FinalResult[];
  hasMultiCurrency: boolean;
}
