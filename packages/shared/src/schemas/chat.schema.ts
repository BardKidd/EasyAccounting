import { z } from 'zod';
import { RootType } from '../constants';

/**
 * AI Chat 助理「tool-calling」用的 schema。
 * 這些 schema 用來驗證 LLM 產生的 tool 參數，避免直接信任模型輸出。
 * 注意：所有查詢的 userId 一律由後端以登入身分注入，LLM 不得指定。
 */

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/u, '日期格式必須為 YYYY-MM-DD');

/** list_categories：列出可用分類，可選擇只看某個收支類型 */
export const chatListCategoriesSchema = z.object({
  type: z.enum([RootType.INCOME, RootType.EXPENSE]).optional(),
});
export type ChatListCategoriesArgs = z.infer<typeof chatListCategoriesSchema>;

/** 查詢類 tool 共用的日期區間 */
export const chatDateRangeSchema = z
  .object({
    startDate: dateString,
    endDate: dateString,
  })
  .refine((d) => d.startDate <= d.endDate, {
    message: '起始日不可晚於結束日（startDate 必須 <= endDate）',
    path: ['startDate'],
  });
export type ChatDateRangeArgs = z.infer<typeof chatDateRangeSchema>;

/** query_transactions：依日期、類型、關鍵字、金額區間過濾交易 */
export const chatQueryTransactionsSchema = z
  .object({
    startDate: dateString.optional(),
    endDate: dateString.optional(),
    type: z.enum([RootType.INCOME, RootType.EXPENSE]).optional(),
    keyword: z.string().trim().min(1).max(50).optional(),
    minAmount: z.number().nonnegative().optional(),
    maxAmount: z.number().nonnegative().optional(),
    limit: z.coerce.number().int().min(1).max(20).optional().default(20),
  })
  .refine(
    (d) =>
      d.startDate === undefined ||
      d.endDate === undefined ||
      d.startDate <= d.endDate,
    {
      message: '起始日不可晚於結束日（startDate 必須 <= endDate）',
      path: ['startDate'],
    },
  )
  .refine(
    (d) =>
      d.minAmount === undefined ||
      d.maxAmount === undefined ||
      d.minAmount <= d.maxAmount,
    {
      message: '最小金額不可大於最大金額（minAmount 必須 <= maxAmount）',
      path: ['minAmount'],
    },
  );
export type ChatQueryTransactionsArgs = z.infer<
  typeof chatQueryTransactionsSchema
>;

/**
 * create_transaction：LLM 以自然語言欄位產生「交易草稿」。
 * categoryName / accountName 為人類可讀名稱，後端會解析成實際 UUID，
 * LLM 不需要（也不應該）知道內部 id。
 */
export const chatCreateTransactionDraftSchema = z.object({
  amount: z.number().positive('金額必須大於 0'),
  type: z.enum([RootType.INCOME, RootType.EXPENSE]),
  categoryName: z.string().trim().min(1, '請提供分類名稱'),
  accountName: z.string().trim().min(1).optional(),
  description: z.string().trim().max(200).optional(),
  date: dateString.optional(),
});
export type ChatCreateTransactionDraftArgs = z.infer<
  typeof chatCreateTransactionDraftSchema
>;

/**
 * 後端解析名稱→id 後，回給前端做「確認後才寫入」的結構化草稿。
 * 前端拿到後彈出確認卡片，使用者按確認才會打既有的 POST /transaction。
 */
export interface ChatTransactionDraft {
  amount: number;
  type: RootType.INCOME | RootType.EXPENSE;
  date: string;
  time: string;
  description: string | null;
  accountId: string;
  accountName: string;
  categoryId: string;
  categoryName: string;
}
