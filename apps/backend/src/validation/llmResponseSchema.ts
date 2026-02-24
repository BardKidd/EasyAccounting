import { z, RootType } from '@repo/shared';

/**
 * LLM 回傳的單筆交易 schema
 *
 * OpenRouter 回傳 JSON 後，用此 schema 驗證並正規化
 */
export const ParsedTransactionSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式應為 YYYY-MM-DD')
    .nullable()
    .default(null),
  time: z.string().nullable().default(null),
  description: z.string().min(1, '描述不可為空'),
  amount: z.preprocess(
    (val) => {
      // 正規化：去掉千分位符號和貨幣符號
      if (typeof val === 'string') {
        return parseFloat(val.replace(/[,$￥¥€£\s]/g, ''));
      }
      return val;
    },
    z.number().min(0, '金額必須大於或等於 0'),
  ),
  type: z.preprocess((val) => {
    // 支援舊的英文回傳值，並自動 mapping 為 RootType
    if (val === 'income') return RootType.INCOME;
    if (val === 'expense') return RootType.EXPENSE;
    return val;
  }, z.nativeEnum(RootType)),
  isInstallment: z.boolean().default(false),
  installmentCurrent: z.number().int().positive().nullable().default(null),
  installmentTotal: z.number().int().positive().nullable().default(null),
  currency: z.string().default('TWD'),
  extraAdd: z.number().default(0), // 折扣
  extraMinus: z.number().default(0), // 手續費
  suggestedCategory: z.string().nullable().default(null), // LLM 建議的類別名稱（如 "飲食/午餐"）
});

export const ParsedTransactionsSchema = z.array(ParsedTransactionSchema);

export type ParsedTransaction = z.infer<typeof ParsedTransactionSchema>;

/**
 * 從 LLM 回傳的 raw string 中提取並驗證 JSON
 */
export const parseLlmResponse = (
  raw: string,
):
  | { success: true; data: ParsedTransaction[] }
  | { success: false; error: string } => {
  let jsonStr = '';

  // 1. 嘗試從 markdown code block 中提取
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1]!.trim();
  } else {
    // 2. 如果沒有 code block，嘗試找最外層的 [ ]
    const firstBracket = raw.indexOf('[');
    const lastBracket = raw.lastIndexOf(']');
    if (
      firstBracket !== -1 &&
      lastBracket !== -1 &&
      lastBracket > firstBracket
    ) {
      jsonStr = raw.substring(firstBracket, lastBracket + 1);
    } else {
      // 3. 最後嘗試直接 parse 整個字串
      jsonStr = raw.trim();
    }
  }

  try {
    const parsed = JSON.parse(jsonStr);
    const result = ParsedTransactionsSchema.safeParse(parsed);

    if (!result.success) {
      return {
        success: false,
        error: `驗證失敗: ${result.error.issues.map((i) => i.message).join(', ')}`,
      };
    }

    return { success: true, data: result.data };
  } catch (error) {
    return {
      success: false,
      error: `JSON 解析失敗: ${error instanceof Error ? error.message : 'Unknown'} (Raw length: ${raw.length})`,
    };
  }
};
