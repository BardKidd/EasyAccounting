import { z } from 'zod';

export const postAnnouncementSchema = z.object({
  title: z.string().min(1, '標題為必填').max(100, '標題不得超過 100 個字元'),
  content: z
    .string()
    .min(1, '內容為必填')
    .max(1000, '內容不得超過 1000 個字元'),
  type: z
    .enum(['maintenance', 'news'], {
      errorMap: () => ({ message: '公告類型必須為 maintenance 或 news' }),
    })
    .optional()
    .default('news'),
  isActive: z.boolean().optional().default(true),
  expiresAt: z.string(),
});

export const updateAnnouncementSchema = postAnnouncementSchema;

export type PostAnnouncementInput = z.infer<typeof postAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;
