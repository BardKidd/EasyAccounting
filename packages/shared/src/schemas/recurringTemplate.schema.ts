import { z } from 'zod';
import { RecurringFrequency, RootType, PaymentFrequency } from '../constants';

const baseTransactionAttrsSchema = z.object({
  accountId: z.string().uuid(),
  categoryId: z.string().uuid(),
  amount: z.number().positive(),
  type: z.enum([RootType.EXPENSE, RootType.INCOME]),
  description: z.string().nullable().optional(),
  receipt: z.string().nullable().optional(),
  paymentFrequency: z.nativeEnum(PaymentFrequency),
  extraAdd: z.number().optional(),
  extraAddLabel: z.string().optional(),
  extraMinus: z.number().optional(),
  extraMinusLabel: z.string().optional(),
  time: z.string().optional(),
});

export const createRecurringTemplateSchema = z.object({
  baseTransactionAttrs: baseTransactionAttrsSchema,
  frequency: z.nativeEnum(RecurringFrequency),
  // 每月的「幾號」/ 每週的「星期幾 (0-6)」/ 每年的「月-日 (MM-DD)」
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  monthDay: z.string().optional(), // e.g. "02-29"
  // 結束條件：null = 無限
  totalOccurrences: z.number().int().positive().nullable().optional(),
  // 第一次執行日期（YYYY-MM-DD），不傳則預設今天
  startDate: z.string().optional(),
});

export const updateRecurringTemplateFutureSchema = z.object({
  // 觸發此操作的那筆 transactionId（同步更新），若未傳則純更新未來設定
  transactionId: z.string().uuid().optional(),
  baseTransactionAttrs: baseTransactionAttrsSchema.partial(),
});

export const cancelRecurringTemplateSchema = z.object({
  // 觸發此操作的那筆 transactionId（同步刪除），若未傳則純刪除主檔
  transactionId: z.string().uuid().optional(),
});

export type CreateRecurringTemplateSchema = z.infer<
  typeof createRecurringTemplateSchema
>;
export type UpdateRecurringTemplateFutureSchema = z.infer<
  typeof updateRecurringTemplateFutureSchema
>;
export type CancelRecurringTemplateSchema = z.infer<
  typeof cancelRecurringTemplateSchema
>;
