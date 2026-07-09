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

// 拆分子項輸入（Phase B）：amount 為原幣毛額
export const splitInputSchema = z.object({
  categoryId: z.string().uuid(),
  amount: z.number().positive('子項金額須為正數'),
  note: z.string().nullable().optional(),
});
export type SplitInput = z.infer<typeof splitInputSchema>;

// 子項加總與交易金額配平容差（吸收浮點/分位誤差）
export const SPLIT_BALANCE_EPSILON = 0.01;

// 拆分前置檢查 + 配平（create/update 共用；service 為權威驗證，schema 為前端友善提示）
const splitRefine = (d: any, ctx: z.RefinementCtx) => {
  const splits = d.splits as SplitInput[] | undefined;
  if (!splits || splits.length === 0) return;
  if (splits.length < 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '拆分至少需 2 個子項',
      path: ['splits'],
    });
  }
  if (d.type === RootType.OPERATE) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '轉帳不可拆分',
      path: ['splits'],
    });
  }
  if (d.installment) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '分期交易不可拆分',
      path: ['splits'],
    });
  }
  // amount 缺（部分更新）時跳過配平，由 service 用既有 amount 權威驗證
  if (d.amount != null) {
    const sum = splits.reduce((s, x) => s + Number(x.amount), 0);
    if (Math.abs(sum - Number(d.amount)) > SPLIT_BALANCE_EPSILON) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '子項金額加總須等於交易金額',
        path: ['splits'],
      });
    }
  }
};

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
  // 拆分交易（Phase B）：一筆拆成多分類子項；Σ amount 須等於 amount。
  // undefined/[] = 不拆分；提供時須 ≥2 子項、僅收入/支出、非分期（service 為權威驗證）。
  splits: z.array(splitInputSchema).optional(),
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
).superRefine(splitRefine);

export const createTransferSchema = baseSchema.and(
  z.object({
    targetAccountId: z.string().uuid(),
    type: z.enum([RootType.OPERATE]), // 前端只能傳 OPERATE 進來，後端會判斷哪個是支出哪個是收入
    // 跨幣轉帳：targetAmount = 目標帳戶實收金額（目標幣計價）；同幣可省（預設 = amount）。
    // exchangeRate（來源幣→目標幣）由 baseSchema 帶入，可省（後端可由 amount/targetAmount 推得）。
    targetAmount: z.number().optional(),
  }),
).superRefine((d: any, ctx) => {
  if (d.splits && d.splits.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '轉帳不可拆分',
      path: ['splits'],
    });
  }
});

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
  .partial()
  .superRefine(splitRefine);

export const getTransactionsByDateSchema = z.object({
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  type: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  date: z.string().optional(),
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  // 關鍵字搜尋：對 description 做不分大小寫的子字串比對（Postgres ILIKE）
  keyword: z.string().trim().min(1).optional(),
  // 金額區間：對原幣 amount 做 >= / <= 範圍過濾（皆選填，可只給一端）
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
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
  // 拆分模式不需頂層分類，故改 optional；非拆分時由元件 superRefine 強制必填。
  mainCategory: z.string().optional(),
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
  // 拆分子項（Phase B）：每列分類 + 金額 + 備註；空陣列/undefined = 不拆分
  splits: z
    .array(
      z.object({
        categoryId: z.string().min(1, '請選擇分類'),
        amount: z.coerce.number(),
        note: z.string().optional(),
      }),
    )
    .optional(),
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
