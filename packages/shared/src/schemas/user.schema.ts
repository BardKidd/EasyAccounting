import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(1, '使用者名稱為必填'),
  email: z.string().email('請輸入有效的電子郵件地址'),
  password: z.string().min(8, '密碼至少需要 8 個字元'),
});

export const updateUserSchema = createUserSchema;

// 切換本位幣（多幣別）
export const changeBaseCurrencySchema = z.object({
  baseCurrencyCode: z.string().length(3, '幣別代碼需為 3 碼'),
});

// 轉成 TypeScript 看比較看得懂的 type
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangeBaseCurrencyInput = z.infer<typeof changeBaseCurrencySchema>;
