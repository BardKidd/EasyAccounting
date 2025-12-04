import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('請輸入有效的電子郵件地址'),
  password: z.string().min(8, '密碼至少需要 8 個字元'),
});

export const registerSchema = loginSchema
  .extend({
    name: z.string().min(1, '姓名為必填'),
    confirmPassword: z.string().min(1, '請確認密碼'),
  })
  .superRefine(({ password, confirmPassword }, ctx) => {
    // 取得 password 以及 confirmPassword 的值
    if (password !== confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom, // 給 TS 看的，否則會報錯。
        message: '密碼不相符',
        path: ['confirmPassword'], // 錯誤訊息會顯示在 confirmPassword 欄位
      });
    }
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
