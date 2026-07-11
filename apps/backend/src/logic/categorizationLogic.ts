import { RootType, RuleMatchMode } from '@repo/shared';

// 規則引擎純運算（Rules Engine Phase B，rules-engine-spec R8/R9）。
// 不碰 DB：條件比對 + 規則套用（第一個命中的分類 wins、標籤取聯集）。

export interface RuleForMatch {
  id: string;
  descriptionMatch: string | null;
  matchMode: RuleMatchMode;
  amountMin: number | null;
  amountMax: number | null;
  transactionType: RootType | null;
  setCategoryId: string | null;
  tagIds: string[];
}

export interface DraftForMatch {
  description: string | null;
  amount: number;
  type: RootType; // EXPENSE / INCOME
}

// 一條規則是否命中（已填條件全部 AND；未填條件視為不限制）。
export const ruleMatches = (
  rule: RuleForMatch,
  draft: DraftForMatch,
): boolean => {
  if (rule.descriptionMatch) {
    const desc = (draft.description || '').toLowerCase();
    const needle = rule.descriptionMatch.toLowerCase();
    if (!desc) return false;
    if (rule.matchMode === RuleMatchMode.EQUALS) {
      if (desc !== needle) return false;
    } else if (rule.matchMode === RuleMatchMode.STARTS_WITH) {
      if (!desc.startsWith(needle)) return false;
    } else {
      // CONTAINS（預設）
      if (!desc.includes(needle)) return false;
    }
  }
  if (rule.amountMin != null && draft.amount < rule.amountMin) return false;
  if (rule.amountMax != null && draft.amount > rule.amountMax) return false;
  if (rule.transactionType && draft.type !== rule.transactionType) return false;
  return true;
};

export interface ApplyRulesResult {
  categoryId: string | null;
  tagIds: string[];
}

/**
 * 套用規則。rules 須已排序（priority asc、createdAt asc）。
 *  - 分類：第一個命中且有 setCategoryId（且在 validCategoryIds 內，若有提供）的規則決定（first-match-wins）。
 *  - 標籤：所有命中規則的 tagIds 取聯集（accumulate）。
 * validCategoryIds 用於跳過指向已刪分類的動作（R12）；未提供則不過濾。
 */
export const applyRules = (
  rules: RuleForMatch[],
  draft: DraftForMatch,
  opts?: { validCategoryIds?: Set<string> },
): ApplyRulesResult => {
  let categoryId: string | null = null;
  const tagIds = new Set<string>();

  for (const rule of rules) {
    if (!ruleMatches(rule, draft)) continue;

    if (categoryId === null && rule.setCategoryId) {
      const live =
        !opts?.validCategoryIds || opts.validCategoryIds.has(rule.setCategoryId);
      if (live) categoryId = rule.setCategoryId;
    }
    for (const t of rule.tagIds) tagIds.add(t);
  }

  return { categoryId, tagIds: [...tagIds] };
};
