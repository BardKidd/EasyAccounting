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
  name: z.string().min(1, 'name is required'),
  // 把全部的分類傳進去
  type: z.enum(allCategoryTypes as [string, ...string[]], {
    errorMap: () => ({ message: 'Invalid category type' }),
  }),
  userId: z.string().uuid().nullable(),
  parentId: z.string().uuid().nullable(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
});

// 更新分類的 schema
export const updateCategorySchema = createCategorySchema;

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
