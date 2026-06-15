import { z } from 'zod';
import {
  RootType,
  PaymentFrequency,
  PeriodType,
  InterestType,
  CalculationMethod,
  RemainderPlacement,
  RewardsType,
} from '../constants';

const baseSchema = z.object({
  accountId: z.string().uuid(),
  categoryId: z.string().uuid(),
  amount: z.number(),
  description: z.string().nullable(),
  date: z.string(),
  time: z.string(),
  receipt: z.string().nullable(),
  paymentFrequency: z.enum([
    PaymentFrequency.ONE_TIME,
    PaymentFrequency.RECURRING,
    PaymentFrequency.INSTALLMENT,
  ]),
  isReconciled: z.boolean().optional(),
  reconciliationDate: z.union([z.string(), z.date()]).nullable().optional(),
  extraAdd: z.number().optional(),
  extraAddLabel: z.string().optional(),
  extraMinus: z.number().optional(),
  extraMinusLabel: z.string().optional(),
  // 多幣別（皆 optional，後端補齊 baseRate/amountInBase）：
  // originalCurrencyCode/originalAmount 記錄原幣事實；exchangeRate = 原幣→帳戶幣別
  originalCurrencyCode: z.string().optional(),
  originalAmount: z.number().optional(),
  exchangeRate: z.number().optional(),
  // 標籤（多對多）：套用到整筆交易。undefined = 不動；[] = 清空（更新時）
  tagIds: z.array(z.string().uuid()).optional(),
});

export const createTransactionSchema = baseSchema.and(
  z.object({
    type: z.enum([RootType.INCOME, RootType.EXPENSE]),
    billingDate: z.string().optional(),
    installment: z
      .object({
        totalInstallments: z.number().int().min(2),
        interestType: z
          .nativeEnum(InterestType)
          .optional()
          .default(InterestType.NONE),
        calculationMethod: z
          .nativeEnum(CalculationMethod)
          .optional()
          .default(CalculationMethod.ROUND),
        remainderPlacement: z
          .nativeEnum(RemainderPlacement)
          .optional()
          .default(RemainderPlacement.FIRST),
        gracePeriod: z.number().int().optional().default(0),
        rewardsType: z
          .nativeEnum(RewardsType)
          .optional()
          .default(RewardsType.EVERY),
      })
      .optional(),
  }),
);

export const createTransferSchema = baseSchema.and(
  z.object({
    targetAccountId: z.string().uuid(),
    type: z.enum([RootType.OPERATE]), // 前端只能傳 OPERATE 進來，後端會判斷哪個是支出哪個是收入
    // 跨幣轉帳：targetAmount = 目標帳戶實收金額（目標幣計價）；同幣可省（預設 = amount）。
    // exchangeRate（來源幣→目標幣）由 baseSchema 帶入，可省（後端可由 amount/targetAmount 推得）。
    targetAmount: z.number().optional(),
  }),
);

// 更新 schema：允許部分更新（如拖放只更新 date）
// ZodIntersection 不支援 .partial()，改用 z.object 包裝並設所有欄位為 optional
export const updateTransactionSchema = baseSchema
  .extend({
    type: z
      .enum([RootType.INCOME, RootType.EXPENSE, RootType.OPERATE])
      .optional(),
    billingDate: z.string().optional(),
    targetAccountId: z.string().uuid().optional(),
    // 跨幣轉帳編輯：目標帳戶實收金額（目標幣計價）；同幣可省。
    // 後端依交易 linkId 路由到 updateTransfer，由它用各 leg 自己的幣別/金額重算。
    targetAmount: z.number().optional(),
  })
  .partial();

export const getTransactionsByDateSchema = z.object({
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  type: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  date: z.string().optional(),
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  // 標籤篩選（match ANY）：可重複 query 參數（?tagIds=a&tagIds=b）或單一字串
  tagIds: z
    .preprocess(
      (v) => (v == null ? undefined : Array.isArray(v) ? v : [v]),
      z.array(z.string().uuid()),
    )
    .optional(),
});

export const getTransactionsDashboardSummarySchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  groupBy: z.nativeEnum(PeriodType).optional(),
});

export type CreateTransactionSchema = z.infer<typeof createTransactionSchema>;
export type CreateTransferSchema = z.infer<typeof createTransferSchema>;
export type UpdateTransactionSchema = z.infer<typeof updateTransactionSchema>;
export type GetTransactionsByDateSchema = z.infer<
  typeof getTransactionsByDateSchema
>;
export type GetTransactionsDashboardSummarySchema = z.infer<
  typeof getTransactionsDashboardSummarySchema
>;

// 前端專用的表單 schema，因為後端的 schema 欄位略有不同
export const transactionFormSchema = z.object({
  accountId: z.string().min(1, '請選擇帳戶'),
  amount: z.coerce.number().min(1, '金額必須大於 0'),
  type: z.enum([RootType.INCOME, RootType.EXPENSE, RootType.OPERATE]),
  date: z.coerce.date(),
  time: z.string(),
  mainCategory: z.string().min(1, '請選擇主分類'),
  subCategory: z.string().optional(),
  description: z.string(),
  targetAccountId: z.string().optional(),
  // 跨幣轉帳：目標帳戶實收金額（目標幣計價）；同幣可省
  targetAmount: z.coerce.number().optional(),
  receipt: z.string(),
  paymentFrequency: z.enum([
    PaymentFrequency.ONE_TIME,
    PaymentFrequency.RECURRING,
    PaymentFrequency.INSTALLMENT,
  ]),
  extraAdd: z.coerce.number().optional(),
  extraAddLabel: z.string().optional(),
  extraMinus: z.coerce.number().optional(),
  extraMinusLabel: z.string().optional(),
  // 標籤（多對多）：選取的 tag id 陣列
  tagIds: z.array(z.string()).optional(),
  installment: z
    .object({
      totalInstallments: z.number().int().min(2),
      interestType: z
        .nativeEnum(InterestType)
        .optional()
        .default(InterestType.NONE),
      calculationMethod: z
        .nativeEnum(CalculationMethod)
        .optional()
        .default(CalculationMethod.ROUND),
      remainderPlacement: z
        .nativeEnum(RemainderPlacement)
        .optional()
        .default(RemainderPlacement.FIRST),
      gracePeriod: z.number().int().optional().default(0),
      rewardsType: z
        .nativeEnum(RewardsType)
        .optional()
        .default(RewardsType.EVERY),
    })
    .optional(),
});
export type TransactionFormSchema = z.input<typeof transactionFormSchema>;
