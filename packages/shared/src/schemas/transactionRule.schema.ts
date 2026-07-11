import { z } from 'zod';
import { RootType, RuleMatchMode } from '../constants';

// 使用者自訂分類規則（Rules Engine Phase B，rules-engine-spec R6/R8/R13）。
// 條件全部 AND；動作 = 套分類 + 套標籤。要 OR → 建多條規則。

const descriptionMatchSchema = z
  .string()
  .trim()
  .min(1, '比對字串不可為空')
  .max(200, '比對字串至多 200 字');

const conditionShape = {
  descriptionMatch: descriptionMatchSchema.nullable().optional(),
  matchMode: z.nativeEnum(RuleMatchMode).optional(),
  amountMin: z.number().nonnegative().nullable().optional(),
  amountMax: z.number().nonnegative().nullable().optional(),
  transactionType: z
    .enum([RootType.EXPENSE, RootType.INCOME])
    .nullable()
    .optional(),
};

const actionShape = {
  setCategoryId: z.string().uuid().nullable().optional(),
  tagIds: z.array(z.string().uuid()).max(20, '至多 20 個標籤').optional(),
};

const hasCondition = (v: {
  descriptionMatch?: string | null;
  amountMin?: number | null;
  amountMax?: number | null;
  transactionType?: string | null;
}) =>
  !!v.descriptionMatch ||
  v.amountMin != null ||
  v.amountMax != null ||
  !!v.transactionType;

const hasAction = (v: {
  setCategoryId?: string | null;
  tagIds?: string[];
}) => !!v.setCategoryId || (Array.isArray(v.tagIds) && v.tagIds.length > 0);

const amountRangeOk = (v: {
  amountMin?: number | null;
  amountMax?: number | null;
}) =>
  v.amountMin == null || v.amountMax == null || v.amountMin <= v.amountMax;

// ---------- Create ----------
export const createTransactionRuleSchema = z
  .object({
    name: z.string().trim().max(60, '名稱至多 60 字').nullable().optional(),
    priority: z.number().int().optional(),
    isEnabled: z.boolean().optional(),
    ...conditionShape,
    ...actionShape,
  })
  .refine(hasCondition, {
    message: '至少需一個條件（description / 金額 / 類型）',
  })
  .refine(hasAction, { message: '至少需一個動作（套分類 / 套標籤）' })
  .refine(amountRangeOk, {
    message: 'amountMin 不可大於 amountMax',
    path: ['amountMin'],
  });
export type CreateTransactionRuleInput = z.infer<
  typeof createTransactionRuleSchema
>;

// ---------- Update（部分更新）----------
export const updateTransactionRuleSchema = z
  .object({
    name: z.string().trim().max(60).nullable().optional(),
    priority: z.number().int().optional(),
    isEnabled: z.boolean().optional(),
    ...conditionShape,
    ...actionShape,
  })
  .refine(amountRangeOk, {
    message: 'amountMin 不可大於 amountMax',
    path: ['amountMin'],
  });
export type UpdateTransactionRuleInput = z.infer<
  typeof updateTransactionRuleSchema
>;

// ---------- Reorder（批次改 priority）----------
export const reorderTransactionRulesSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
});
export type ReorderTransactionRulesInput = z.infer<
  typeof reorderTransactionRulesSchema
>;

// ---------- Route Params ----------
export const transactionRuleIdParamSchema = z.object({
  id: z.string().uuid(),
});

// ---------- List Query ----------
export const listTransactionRulesQuerySchema = z.object({
  includeDisabled: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .optional()
    .transform((v) => v === true || v === 'true'),
});
export type ListTransactionRulesQuery = z.infer<
  typeof listTransactionRulesQuerySchema
>;
