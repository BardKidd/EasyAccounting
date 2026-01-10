import { z } from 'zod';
import { RootType } from '../constants';

// 基礎 Schema (不含預設值)
export const baseCategorySchema = z.object({
  name: z.string().min(1, '分類名稱為必填'),
  type: z.nativeEnum(RootType, {
    errorMap: () => ({ message: '無效的分類類型' }),
  }),
  parentId: z.string().uuid('父分類 ID 格式錯誤').nullable(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
});

// // 創建分類的 schema (加入預設值)
// export const createCategorySchema = baseCategorySchema.extend({
//   icon: z.string().nullable().optional().default('tag'),
//   color: z.string().nullable().optional().default('#3b82f6'),
// });

// 更新分類的 schema (不使用 Partial，強制前端傳送所有欄位，符合 PUT 全量更新語意，且不含預設值)
export const updateCategorySchema = baseCategorySchema;

export type CreateCategoryInput = z.infer<typeof baseCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
