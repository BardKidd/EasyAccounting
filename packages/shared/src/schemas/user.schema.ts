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

// 個人檔案（self-scoped）：身分一律取自 JWT token，schema 不含 userId
export const updateProfileSchema = z.object({
  name: z.string().min(1, '使用者名稱為必填'),
});

// 變更密碼 — 後端驗證用（不含 confirm）
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '請輸入目前密碼'),
  newPassword: z.string().min(8, '密碼至少需要 8 個字元'),
});

// 變更密碼 — 前端表單用：加 confirmNewPassword + 一致性檢查
export const changePasswordFormSchema = changePasswordSchema
  .extend({ confirmNewPassword: z.string().min(1, '請再次輸入新密碼') })
  .refine((d) => d.newPassword === d.confirmNewPassword, {
    message: '兩次輸入的密碼不一致',
    path: ['confirmNewPassword'],
  });

// 轉成 TypeScript 看比較看得懂的 type
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangeBaseCurrencyInput = z.infer<typeof changeBaseCurrencySchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ChangePasswordFormInput = z.infer<typeof changePasswordFormSchema>;
