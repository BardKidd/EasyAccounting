import { z } from 'zod';

// 月份格式：合法月份的 1 號（YYYY-MM-01）——後續以字串比較月份區間，格式不齊會錯位
const monthDateSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])-01$/, '月份格式須為 YYYY-MM-01');

// ---------- Init ----------
export const initBudgetSchema = z.object({
  startMonth: monthDateSchema,
  accountOverrides: z
    .array(
      z.object({
        accountId: z.string().uuid(),
        onBudget: z.boolean(),
      }),
    )
    .optional(),
});
export type InitBudgetInput = z.infer<typeof initBudgetSchema>;

// ---------- Settings ----------
export const budgetSettingsSchema = z.object({
  startMonth: monthDateSchema,
});
export type BudgetSettingsInput = z.infer<typeof budgetSettingsSchema>;

// ---------- Assign ----------
export const assignSchema = z.object({
  assigned: z.number(), // 可為負（搬錢修正）
});
export type AssignInput = z.infer<typeof assignSchema>;

// ---------- Move Money ----------
export const moveMoneySchema = z
  .object({
    fromCategoryId: z.string().uuid().nullable(),
    toCategoryId: z.string().uuid().nullable(),
    amount: z.number().positive('金額須為正數'),
  })
  .refine((d) => d.fromCategoryId !== null || d.toCategoryId !== null, {
    message: 'fromCategoryId 與 toCategoryId 不可同時為 null',
  });
export type MoveMoneyInput = z.infer<typeof moveMoneySchema>;

// ---------- Route Params ----------
export const monthParamSchema = z.object({
  month: monthDateSchema,
});

export const monthCategoryParamsSchema = z.object({
  month: monthDateSchema,
  categoryId: z.string().uuid(),
});

// ---------- Response Types ----------
export interface BudgetEnvelopeRow {
  categoryId: string;
  name: string;
  icon: string | null;
  color: string | null;
  assigned: number;
  activity: number;
  available: number;
  isOverspent: boolean;
}

export interface BudgetRTABreakdown {
  startingBalance: number;
  cumulativeInflow: number;
  cumulativeAssigned: number;
  priorOverspending: number;
}

export interface BudgetMonthView {
  month: string;
  startMonth: string;
  readyToAssign: number;
  rtaBreakdown: BudgetRTABreakdown;
  rows: BudgetEnvelopeRow[];
  unclassifiedTransferOut: { activity: number; available: number } | null;
  totals: { assigned: number; activity: number; available: number };
}

export interface BudgetStatus {
  enabled: boolean;
  startMonth: string | null;
  baseCurrencyCode: string;
  /** 伺服器端「當月」1 號（YYYY-MM-01）——前端據此 clamp 月份上界與預設選月 */
  currentMonth: string;
}
