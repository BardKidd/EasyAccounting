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
  amount: z.number().min(0),
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
  })
);

export const createTransferSchema = baseSchema.and(
  z.object({
    targetAccountId: z.string().uuid(),
    type: z.enum([RootType.OPERATE]), // 前端只能傳 OPERATE 進來，後端會判斷哪個是支出哪個是收入
  })
);

export const updateTransactionSchema = createTransactionSchema;

export const getTransactionsByDateSchema = z.object({
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  type: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  date: z.string().optional(),
  page: z.coerce.number().optional(),
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
  amount: z.coerce.number().min(0, '金額必須大於等於 0'),
  type: z.enum([RootType.INCOME, RootType.EXPENSE, RootType.OPERATE]),
  date: z.coerce.date(),
  time: z.string(),
  mainCategory: z.string().min(1, '請選擇主分類'),
  subCategory: z.string().optional(),
  description: z.string(),
  targetAccountId: z.string().optional(),
  receipt: z.string(),
  paymentFrequency: z.enum([
    PaymentFrequency.ONE_TIME,
    PaymentFrequency.RECURRING,
    PaymentFrequency.INSTALLMENT,
  ]),
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
