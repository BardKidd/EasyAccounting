import { z } from 'zod';

// 色碼：#RRGGBB
const hexColorSchema = z
  .string()
  .regex(/^#([0-9a-fA-F]{6})$/, '色碼格式須為 #RRGGBB');

const tagNameSchema = z
  .string()
  .trim()
  .min(1, '標籤名稱不可為空')
  .max(30, '標籤名稱至多 30 字');

const groupNameSchema = z.string().trim().max(30, '群組名稱至多 30 字');

// ---------- Create ----------
export const createTagSchema = z.object({
  name: tagNameSchema,
  color: hexColorSchema.optional(),
  groupName: groupNameSchema.nullable().optional(),
});
export type CreateTagInput = z.infer<typeof createTagSchema>;

// ---------- Update（部分更新）----------
export const updateTagSchema = z.object({
  name: tagNameSchema.optional(),
  color: hexColorSchema.optional(),
  groupName: groupNameSchema.nullable().optional(),
  isArchived: z.boolean().optional(),
});
export type UpdateTagInput = z.infer<typeof updateTagSchema>;

// ---------- Route Params ----------
export const tagIdParamSchema = z.object({
  id: z.string().uuid(),
});

// ---------- List Query ----------
export const listTagsQuerySchema = z.object({
  includeArchived: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .optional()
    .transform((v) => v === true || v === 'true'),
});
export type ListTagsQuery = z.infer<typeof listTagsQuerySchema>;
