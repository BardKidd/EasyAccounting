import { z } from 'zod';

export const createUserSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  emailNotification: z.boolean().default(false),
});

export const updateUserSchema = createUserSchema;

// 轉成 TypeScript 看比較看得懂的 type
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
