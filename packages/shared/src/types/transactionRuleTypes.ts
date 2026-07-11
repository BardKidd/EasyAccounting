import { RootType, RuleMatchMode } from '../constants';

// 規則型別（前後端共用）。對應 backend src/models/transactionRule.ts。
export interface TransactionRuleType {
  id: string;
  userId: string;
  name: string | null;
  priority: number;
  isEnabled: boolean;
  descriptionMatch: string | null;
  matchMode: RuleMatchMode;
  amountMin: number | null;
  amountMax: number | null;
  transactionType: RootType | null;
  setCategoryId: string | null;
}

// 精簡標籤（規則列表夾帶）
export interface RuleTagBrief {
  id: string;
  name: string;
  color: string;
}

// 管理頁列表項：夾帶分類 / 標籤顯示資訊。
// setCategoryName 為 null 代表未設分類動作或分類已刪除。
export interface TransactionRuleListItem {
  id: string;
  name: string | null;
  priority: number;
  isEnabled: boolean;
  descriptionMatch: string | null;
  matchMode: RuleMatchMode;
  amountMin: number | null;
  amountMax: number | null;
  transactionType: RootType | null;
  setCategoryId: string | null;
  setCategoryName: string | null;
  setCategoryIcon: string | null;
  setCategoryColor: string | null;
  tags: RuleTagBrief[];
}

// resolver 回傳：套用規則/自動學習後的分類與標籤結果。
export interface CategorizationResult {
  categoryId: string | null;
  tagIds: string[];
  source: 'rule' | 'merchant' | 'llm' | 'none';
}
