import { z } from '@repo/shared';

/**
 * LLM 回傳的單筆交易 schema
 *
 * Groq / Together AI 回傳 JSON 後，用此 schema 驗證並正規化
 */
export const ParsedTransactionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式應為 YYYY-MM-DD'),
  time: z.string().nullable().default(null),
  description: z.string().min(1, '描述不可為空'),
  amount: z.preprocess((val) => {
    // 正規化：去掉千分位符號和貨幣符號
    if (typeof val === 'string') {
      return parseFloat(val.replace(/[,$￥¥€£\s]/g, ''));
    }
    return val;
  }, z.number().positive('金額必須大於 0')),
  type: z.enum(['income', 'expense']),
  isInstallment: z.boolean().default(false),
  installmentCurrent: z.number().int().positive().nullable().default(null),
  installmentTotal: z.number().int().positive().nullable().default(null),
  currency: z.string().default('TWD'),
  extraAdd: z.number().default(0), // 折扣
  extraMinus: z.number().default(0), // 手續費
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
  try {
    // 嘗試從 markdown code block 中提取 JSON
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1]!.trim() : raw.trim();

    const parsed = JSON.parse(jsonStr);
    const result = ParsedTransactionsSchema.safeParse(parsed);

    if (!result.success) {
      return {
        success: false,
        error: `LLM 回傳格式驗證失敗: ${result.error.issues.map((i) => i.message).join(', ')}`,
      };
    }

    return { success: true, data: result.data };
  } catch (error) {
    return {
      success: false,
      error: `LLM 回傳 JSON 解析失敗: ${error instanceof Error ? error.message : 'Unknown'}`,
    };
  }
};
