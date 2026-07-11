import { z } from 'zod';

// 商家→分類自動對應（merchant_mapping）的管理 schema。
// 使用者只能治理「系統從自己的帳單解析學到的」對應：改分類 / 停用 / 刪除。
// 建立與 matchCount 累加由 billParse 流程自動處理，不開放手動新增（見 rules-engine-spec R5）。

// ---------- Update（部分更新：改分類 / 啟停）----------
export const updateMerchantMappingSchema = z
  .object({
    categoryId: z.string().uuid().optional(),
    isEnabled: z.boolean().optional(),
  })
  .refine((v) => v.categoryId !== undefined || v.isEnabled !== undefined, {
    message: '至少需提供 categoryId 或 isEnabled 其一',
  });
export type UpdateMerchantMappingInput = z.infer<
  typeof updateMerchantMappingSchema
>;

// ---------- Route Params ----------
export const merchantMappingIdParamSchema = z.object({
  id: z.string().uuid(),
});

// ---------- List Query ----------
export const listMerchantMappingsQuerySchema = z.object({
  includeDisabled: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .optional()
    .transform((v) => v === true || v === 'true'),
});
export type ListMerchantMappingsQuery = z.infer<
  typeof listMerchantMappingsQuerySchema
>;
