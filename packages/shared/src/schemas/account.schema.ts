import { z } from 'zod';
import { Account, PaymentStatus } from '../constants';

const allAccountTypes = [...Object.values(Account)] as const;
const allPaymentStatus = [...Object.values(PaymentStatus)] as const;

export const createAccountSchema = z.object({
  userId: z.string().uuid('使用者 ID 格式錯誤'),
  name: z.string().min(1, '帳戶名稱為必填'),
  type: z.enum(allAccountTypes as [string, ...string[]], {
    errorMap: () => ({ message: '無效的帳戶類型' }),
  }),
  balance: z.number().min(0, '餘額必須大於或等於 0'),
  icon: z.string().min(1, '圖示為必填'),
  color: z.string().min(1, '顏色為必填'),
  isActive: z.boolean().default(true),
  creditLimit: z.number().min(0, '信用額度必須大於或等於 0').optional(),
  unpaidAmount: z.number().min(0, '未繳金額必須大於或等於 0').optional(),
  billingDay: z.date().optional(),
  nextBillingDate: z.date().optional(),
  paymentStatus: z
    .enum(allPaymentStatus as [string, ...string[]], {
      errorMap: () => ({ message: '無效的繳款狀態' }),
    })
    .optional(),
});

export const updateAccountSchema = createAccountSchema;

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
