import { z } from 'zod';
import { Account, Currency } from '../constants';

const allAccountTypes = [...Object.values(Account)] as const;

export const createAccountSchema = z.object({
  name: z.string().min(1, '帳戶名稱為必填'),
  type: z.enum(allAccountTypes as [string, ...string[]], {
    errorMap: () => ({ message: '無效的帳戶類型' }),
  }),
  balance: z.number(), // 可以是負值
  // 帳戶幣別（Phase 1 閘門：前端尚未開放選擇，預設 TWD）。
  // 用 string + refine 而非 nativeEnum：輸入型別為 string，與 AccountType.currencyCode 對齊；
  // 仍驗證必須是已知 Currency，DB 端再有 FK→currency.code 保護。
  currencyCode: z
    .string()
    .refine(
      (c) => (Object.values(Currency) as string[]).includes(c),
      { message: '無效的幣別代碼' },
    )
    .default(Currency.TWD),
  icon: z.string().min(1, '圖示為必填'),
  color: z.string().min(1, '顏色為必填'),
  isArchived: z.boolean().default(false),
  // 未提供時由後端依帳戶類型預設（現金/銀行/信用卡→true，證券戶/其他→false，同 migration 回填語意）
  onBudget: z.boolean().optional(),
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
