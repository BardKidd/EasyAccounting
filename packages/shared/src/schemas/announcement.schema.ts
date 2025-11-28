import { z } from 'zod';

export const postAnnouncementSchema = z.object({
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(1000),
  type: z.enum(['maintenance', 'news']).optional().default('news'),
  isActive: z.boolean().optional().default(true),
  expiresAt: z.string(),
});

export const updateAnnouncementSchema = postAnnouncementSchema;

export type PostAnnouncementInput = z.infer<typeof postAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;
