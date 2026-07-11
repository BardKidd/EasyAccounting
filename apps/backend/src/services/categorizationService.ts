import { Op } from 'sequelize';
import { TransactionRule, Category } from '@/models';
import type { CategorizationResult } from '@repo/shared';
import {
  applyRules,
  type RuleForMatch,
  type DraftForMatch,
} from '@/logic/categorizationLogic';
import { lookupMerchantCategory } from '@/services/merchantMappingServices';

export interface ResolveCtx {
  // billParse 已批次算好的建議（避免 N+1）；提供時 resolver 不再自查 merchant/llm。
  merchantSuggestedCategoryId?: string | null;
  llmSuggestedCategoryId?: string | null;
}

/**
 * 統一分類/標籤解析（Rules Engine Phase B，rules-engine-spec R9）。
 * 優先序：顯式規則（分類 first-match-wins、標籤聯集）→ MerchantMapping → LLM（僅帳單）→ null。
 *
 * ctx.merchantSuggestedCategoryId 為 undefined 時，resolver 自行以 draft.description
 * 查 merchant_mapping fallback（供手動/Excel 單筆）；billParse 傳入批次結果則不重查。
 */
export const resolveCategorization = async (
  userId: string,
  draft: DraftForMatch,
  ctx: ResolveCtx = {},
): Promise<CategorizationResult> => {
  // 1. 載入使用者啟用規則 + 其標籤（priority asc、createdAt asc）
  const rules = await TransactionRule.findAll({
    where: { userId, isEnabled: true },
    include: [
      {
        association: 'tags',
        attributes: ['id'],
        through: { attributes: [] },
      },
    ],
    order: [
      ['priority', 'ASC'],
      ['createdAt', 'ASC'],
    ],
  });

  const mapped: RuleForMatch[] = rules.map((r: any) => ({
    id: r.id,
    descriptionMatch: r.descriptionMatch,
    matchMode: r.matchMode,
    amountMin: r.amountMin == null ? null : Number(r.amountMin),
    amountMax: r.amountMax == null ? null : Number(r.amountMax),
    transactionType: r.transactionType,
    setCategoryId: r.setCategoryId,
    tagIds: (r.tags || []).map((t: any) => t.id),
  }));

  // 2. 過濾 setCategoryId 指向已刪/無權限分類（R12）：只認本人或全域、未軟刪的分類
  const setCatIds = [
    ...new Set(mapped.map((r) => r.setCategoryId).filter(Boolean)),
  ] as string[];
  let validCategoryIds: Set<string> | undefined;
  if (setCatIds.length > 0) {
    const live = await Category.findAll({
      where: { id: { [Op.in]: setCatIds }, [Op.or]: [{ userId }, { userId: null }] },
      attributes: ['id'],
    });
    validCategoryIds = new Set(live.map((c: any) => c.id));
  }

  const { categoryId: ruleCategoryId, tagIds } = applyRules(mapped, draft, {
    validCategoryIds,
  });

  // 3. 分類 fallback 鏈：規則 → merchant → llm → null
  let categoryId = ruleCategoryId;
  let source: CategorizationResult['source'] = ruleCategoryId ? 'rule' : 'none';

  if (!categoryId) {
    const merchantCat =
      ctx.merchantSuggestedCategoryId !== undefined
        ? ctx.merchantSuggestedCategoryId
        : await lookupMerchantCategory(userId, draft.description);
    if (merchantCat) {
      categoryId = merchantCat;
      source = 'merchant';
    }
  }

  if (!categoryId && ctx.llmSuggestedCategoryId) {
    categoryId = ctx.llmSuggestedCategoryId;
    source = 'llm';
  }

  return { categoryId, tagIds, source };
};
