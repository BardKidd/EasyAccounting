import { z } from 'zod';
import { Account } from '../constants';

const allAccountTypes = [...Object.values(Account)] as const;

export const createAccountSchema = z.object({
  name: z.string().min(1, '帳戶名稱為必填'),
  type: z.enum(allAccountTypes as [string, ...string[]], {
    errorMap: () => ({ message: '無效的帳戶類型' }),
  }),
  balance: z.number(), // 可以是負值
  icon: z.string().min(1, '圖示為必填'),
  color: z.string().min(1, '顏色為必填'),
  isArchived: z.boolean().default(false),
  creditCardDetail: z
    .object({
      statementDate: z.coerce.number().min(1).max(31),
      paymentDueDate: z.coerce.number().min(1).max(31),
      gracePeriod: z.coerce.number().min(0).max(60).default(0),
      interestRate: z.coerce.number().min(0).max(100).default(0).optional(),
      creditLimit: z.coerce.number().min(0),
      includeInTotal: z.boolean().default(true),
    })
    .optional(),
});

export const updateAccountSchema = createAccountSchema.extend({
  id: z.string(), // account id
});

//! z.input 指的是驗證原始資料的格式，而 z.infer 指的是驗證後的資料格式
export type CreateAccountInput = z.input<typeof createAccountSchema>;
export type UpdateAccountInput = z.input<typeof updateAccountSchema>;
