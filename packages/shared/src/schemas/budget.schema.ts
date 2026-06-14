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
// 端點可為：分類信封（categoryId）/ CC Payment 信封（creditAccountId）/ RTA（皆 null）。
// 四欄皆 optional+nullable，向後相容既有「分類↔RTA」呼叫；至少一端非 RTA。
export const moveMoneySchema = z
  .object({
    fromCategoryId: z.string().uuid().nullable().optional(),
    toCategoryId: z.string().uuid().nullable().optional(),
    fromCreditAccountId: z.string().uuid().nullable().optional(),
    toCreditAccountId: z.string().uuid().nullable().optional(),
    amount: z.number().positive('金額須為正數'),
  })
  .refine(
    (d) =>
      !!(
        d.fromCategoryId ||
        d.toCategoryId ||
        d.fromCreditAccountId ||
        d.toCreditAccountId
      ),
    { message: '來源與目的不可同時為可分配金額(RTA)' },
  );
export type MoveMoneyInput = z.infer<typeof moveMoneySchema>;

// ---------- Targets（Phase 2 ③ / P2-D10）----------
export const BUDGET_TARGET_TYPES = [
  'SET_ASIDE', // 每月另存 X
  'REFILL', // 補滿到 X
  'BALANCE_BY_DATE', // 到期月前湊到 X
] as const;
export type BudgetTargetType = (typeof BUDGET_TARGET_TYPES)[number];

export const upsertTargetSchema = z
  .object({
    type: z.enum(BUDGET_TARGET_TYPES),
    amount: z.number().nonnegative('目標金額須 ≥ 0'),
    dueDate: monthDateSchema.nullable().optional(),
  })
  .refine((d) => d.type !== 'BALANCE_BY_DATE' || !!d.dueDate, {
    message: 'BALANCE_BY_DATE 須提供到期月 dueDate',
    path: ['dueDate'],
  });
export type UpsertTargetInput = z.infer<typeof upsertTargetSchema>;

// ---------- Auto-Assign（Phase 2 ③ / P2-D10）----------
export const AUTO_ASSIGN_STRATEGIES = [
  'UNDERFUNDED', // 補足各信封 target 缺口
  'LAST_MONTH', // 沿用上月各信封 assigned
] as const;
export type AutoAssignStrategy = (typeof AUTO_ASSIGN_STRATEGIES)[number];
export const autoAssignSchema = z.object({
  strategy: z.enum(AUTO_ASSIGN_STRATEGIES),
});
export type AutoAssignInput = z.infer<typeof autoAssignSchema>;

// ---------- Route Params ----------
export const monthParamSchema = z.object({
  month: monthDateSchema,
});

export const monthCategoryParamsSchema = z.object({
  month: monthDateSchema,
  categoryId: z.string().uuid(),
});

// CC Payment assign（Phase 2 ④）：以信用卡 accountId 為錨
export const monthCreditParamsSchema = z.object({
  month: monthDateSchema,
  accountId: z.string().uuid(),
});

export const categoryParamSchema = z.object({
  categoryId: z.string().uuid(),
});

// ---------- Response Types ----------
export interface BudgetTargetInfo {
  type: BudgetTargetType;
  amount: number;
  dueDate: string | null;
}

/** 超支種類（Phase 2 ④）：cash 扣下月 RTA；credit 留為卡債不扣 RTA；mixed 兩者皆有 */
export type OverspendKind = 'cash' | 'credit' | 'mixed' | null;

export interface BudgetEnvelopeRow {
  categoryId: string;
  name: string;
  icon: string | null;
  color: string | null;
  assigned: number;
  activity: number;
  available: number;
  isOverspent: boolean;
  /** 該信封的 target（Phase 2 ③）；無則 null */
  target: BudgetTargetInfo | null;
  /** 依 target 推導的本月缺口（需再分配多少才達標）；無 target 為 0 */
  underfunded: number;
  /** 本月超支的種類（Phase 2 ④）；未超支為 null */
  overspendKind: OverspendKind;
}

/** 信用卡付款（CC Payment）信封列（Phase 2 ④ / P2-D1） */
export interface CreditCardPaymentRow {
  accountId: string;
  name: string;
  /** 本月撥備給此卡的金額（自 RTA 分配） */
  assigned: number;
  /** 本月 CC Payment 變動 = 覆蓋移入 − 還款移出 */
  activity: number;
  /** 已撥備可付此卡的金額；負 = 卡債尚未撥備 */
  available: number;
  /** 本月自各信封覆蓋移入此卡的金額 */
  covered: number;
  /** 本月還款（銀行→卡）總額（正） */
  payments: number;
  /** available < 0 */
  isDebt: boolean;
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
  /** 信用卡付款信封（Phase 2 ④）；無 on-budget 信用卡時為 [] */
  creditCardPayments: CreditCardPaymentRow[];
  /** 本月信用超支總額（提示用，不扣 RTA） */
  creditOverspending: number;
  totals: { assigned: number; activity: number; available: number };
}

export interface BudgetStatus {
  enabled: boolean;
  startMonth: string | null;
  baseCurrencyCode: string;
  /** 伺服器端「當月」1 號（YYYY-MM-01）——前端據此 clamp 月份上界與預設選月 */
  currentMonth: string;
}
