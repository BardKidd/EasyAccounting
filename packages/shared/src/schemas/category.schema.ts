import { z } from 'zod';
import { MainType, SubType, DetailType } from '../constants';

// 所有可能的分類值
const allCategoryTypes = [
  ...Object.values(MainType),
  ...Object.values(SubType),
  ...Object.values(DetailType),
] as const;

// 創建分類的 schema
export const createCategorySchema = z.object({
  name: z.string().min(1, '分類名稱為必填'),
  // 把全部的分類傳進去
  type: z.enum(allCategoryTypes as [string, ...string[]], {
    errorMap: () => ({ message: '無效的分類類型' }),
  }),
  userId: z.string().uuid('使用者 ID 格式錯誤').nullable(),
  parentId: z.string().uuid('父分類 ID 格式錯誤').nullable(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
});

// 更新分類的 schema
export const updateCategorySchema = createCategorySchema;

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
