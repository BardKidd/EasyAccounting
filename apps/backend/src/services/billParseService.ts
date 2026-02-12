import PendingTransaction from '@/models/PendingTransaction';
import MerchantMapping from '@/models/MerchantMapping';
import Transaction from '@/models/transaction';
import { PendingTransactionStatus } from '@repo/shared';
import { ParsedTransaction } from '@/validation/llmResponseSchema';
import { Op } from 'sequelize';

// ---------- LIKE escape ----------

/**
 * Escape LIKE 特殊字元，避免 LLM 回傳的商家名稱含 % 或 _ 導致意外匹配
 */
const escapeLike = (str: string): string => {
  return str.replace(/[%_\\]/g, '\\$&');
};

// ---------- 批次類別建議 ----------

/**
 * 批次查詢 merchant_mapping 取建議類別
 *
 * 收集所有 unique description，一次查完，避免 N+1
 * 回傳 Map<description, categoryId>
 */
const batchSuggestCategories = async (
  descriptions: string[],
): Promise<Map<string, string | null>> => {
  const unique = [...new Set(descriptions)];
  const result = new Map<string, string | null>();

  // 一次查全部，用 OR 條件
  const mappings = await MerchantMapping.findAll({
    where: {
      merchantName: {
        [Op.or]: unique.map((desc) => ({
          [Op.iLike]: `%${escapeLike(desc)}%`,
        })),
      },
    },
    order: [['matchCount', 'DESC']],
  });

  // 為每個 description 找到最佳匹配
  for (const desc of unique) {
    const lowerDesc = desc.toLowerCase();
    const match = mappings.find(
      (m) =>
        m.merchantName.toLowerCase().includes(lowerDesc) ||
        lowerDesc.includes(m.merchantName.toLowerCase()),
    );
    result.set(desc, match?.categoryId || null);
  }

  return result;
};

// ---------- 批次分期交易比對 ----------

/**
 * 批次查詢分期交易比對
 *
 * 只查有標記 isInstallment 的交易，一次查完
 */
const batchMatchInstallments = async (
  userId: string,
  transactions: ParsedTransaction[],
): Promise<Map<number, string | null>> => {
  const result = new Map<number, string | null>();
  const installments = transactions
    .map((tx, idx) => ({ tx, idx }))
    .filter(({ tx }) => tx.isInstallment);

  if (installments.length === 0) return result;

  // 所有分期交易的日期範圍（最早-30天 到 最晚+30天）
  const dates = installments.map(({ tx }) => new Date(tx.date));
  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  minDate.setDate(minDate.getDate() - 30);
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
  maxDate.setDate(maxDate.getDate() + 30);

  // 一次查出時間範圍內所有可能匹配的交易
  const existingTransactions = await Transaction.findAll({
    where: {
      userId,
      date: { [Op.between]: [minDate, maxDate] },
      description: {
        [Op.or]: installments.map(({ tx }) => ({
          [Op.iLike]: `%${escapeLike(tx.description)}%`,
        })),
      },
    },
  });

  // 為每筆分期交易找匹配
  for (const { tx, idx } of installments) {
    const match = existingTransactions.find(
      (existing) =>
        Number(existing.amount) === tx.amount &&
        existing.description
          ?.toLowerCase()
          .includes(tx.description.toLowerCase()),
    );
    result.set(idx, match?.id || null);
  }

  return result;
};

// ---------- 儲存解析結果 ----------

/**
 * 將 LLM 解析結果存入 pending_transaction
 *
 * 1. 批次查 merchant_mapping 取建議類別（避免 N+1）
 * 2. 批次查分期交易比對（避免 N+1）
 * 3. 批次寫入 pending_transaction
 */
export const saveParsedResults = async (
  uploadId: string,
  userId: string,
  transactions: ParsedTransaction[],
): Promise<number> => {
  // 一次查完所有類別建議
  const categoryMap = await batchSuggestCategories(
    transactions.map((tx) => tx.description),
  );

  // 一次查完所有分期交易比對
  const installmentMap = await batchMatchInstallments(userId, transactions);

  const pendingRecords = transactions.map((tx, idx) => {
    const suggestedCategoryId = categoryMap.get(tx.description) || null;
    const matchedTransactionId = installmentMap.get(idx) || null;

    return {
      userId,
      uploadBatchId: uploadId,
      rawMerchantName: tx.description,
      suggestedCategoryId,
      matchedTransactionId,
      isInstallment: tx.isInstallment,
      installmentNumber: tx.installmentCurrent,
      status: PendingTransactionStatus.PENDING,
      transactionData: {
        amount: tx.amount,
        type: tx.type,
        description: tx.description,
        date: tx.date,
        time: tx.time,
        accountId: null, // 用戶確認時選擇
        categoryId: suggestedCategoryId,
        extraAdd: tx.extraAdd,
        extraMinus: tx.extraMinus,
        currency: tx.currency,
      },
    };
  });

  await PendingTransaction.bulkCreate(pendingRecords);

  return pendingRecords.length;
};
