import PendingTransaction from '@/models/PendingTransaction';
import MerchantMapping from '@/models/MerchantMapping';
import Transaction from '@/models/transaction';
import Category from '@/models/category';
import {
  PendingTransactionStatus,
  RootType,
  PaymentFrequency,
} from '@repo/shared';
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
// export：供整合測試直接驗證 per-user 讀取隔離（洩漏修復）。
export const batchSuggestCategories = async (
  userId: string,
  descriptions: string[],
): Promise<Map<string, string | null>> => {
  const unique = [...new Set(descriptions)];
  const result = new Map<string, string | null>();

  // 一次查全部，用 OR 條件。per-user 隔離：只查本人、已啟用的對應
  // （防跨使用者洩漏他人 categoryId；停用的對應不參與匹配）。
  const mappings = await MerchantMapping.findAll({
    where: {
      userId,
      isEnabled: true,
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

// ---------- LLM 類別清單生成 ----------

/**
 * 產生 LLM prompt 用的扁平化類別清單
 *
 * 格式：每行一個，如 "- 飲食/午餐" 或 "- 購物"
 * 只取 expense 類型的類別
 */
export const buildCategoryListForPrompt = async (
  userId: string,
): Promise<string> => {
  const categories = await Category.findAll({
    where: {
      [Op.or]: [{ userId }, { userId: null }],
    },
  });

  // 找到 expense root
  const expenseRoot = categories.find(
    (c) => (c as any).type === RootType.EXPENSE && (c as any).parentId === null,
  );
  if (!expenseRoot) return '';

  const expenseRootId = (expenseRoot as any).id;

  // Main categories（parentId 指向 expense root）
  const mainCats = categories.filter(
    (c) => (c as any).parentId === expenseRootId,
  );

  const lines: string[] = [];

  for (const main of mainCats) {
    const mainName = (main as any).name as string;
    const mainId = (main as any).id as string;

    // Sub categories
    const subs = categories.filter((c) => (c as any).parentId === mainId);

    if (subs.length === 0) {
      // 無子分類 → 直接列出主分類
      lines.push(`- ${mainName}`);
    } else {
      for (const sub of subs) {
        lines.push(`- ${mainName}/${(sub as any).name}`);
      }
    }
  }

  return lines.join('\n');
};

// ---------- LLM 類別名稱 → categoryId ----------

/**
 * 批次將 LLM 回傳的 suggestedCategory 名稱對應到 categoryId
 *
 * 支援格式："主分類/子分類" 或 "主分類"
 */
const batchMatchCategoriesByName = async (
  suggestedNames: (string | null)[],
  userId: string,
): Promise<Map<string, string | null>> => {
  const result = new Map<string, string | null>();
  const uniqueNames = [
    ...new Set(suggestedNames.filter((n): n is string => n !== null)),
  ];

  if (uniqueNames.length === 0) return result;

  const categories = await Category.findAll({
    where: {
      [Op.or]: [{ userId }, { userId: null }],
    },
  });

  // 建立 name → category 的 map（需考慮層級）
  const catById = new Map<string, any>();
  for (const c of categories) {
    catById.set((c as any).id, (c as any).toJSON());
  }

  for (const name of uniqueNames) {
    const parts = name.split('/');

    if (parts.length === 2) {
      // "主分類/子分類" 格式
      const [mainName, subName] = parts;
      const mainCat = categories.find(
        (c) => (c as any).name === mainName && (c as any).parentId !== null,
      );
      if (mainCat) {
        const subCat = categories.find(
          (c) =>
            (c as any).name === subName &&
            (c as any).parentId === (mainCat as any).id,
        );
        result.set(name, subCat ? (subCat as any).id : (mainCat as any).id);
      } else {
        result.set(name, null);
      }
    } else {
      // "主分類" 格式 → 直接用主分類
      const mainCat = categories.find(
        (c) => (c as any).name === name && (c as any).parentId !== null,
      );
      result.set(name, mainCat ? (mainCat as any).id : null);
    }
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

  // 所有分期交易的日期範圍：分期可能跨越數月甚至數年，將往前查詢範圍拉長（例如：往回推 2 年，往後推 30 天）
  const dates = installments.map(({ tx }) => new Date(tx.date ?? 0));
  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  minDate.setFullYear(minDate.getFullYear() - 2); // 往前找 2 年的分期紀錄
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
  maxDate.setDate(maxDate.getDate() + 30);

  // 一次查出時間範圍內所有可能匹配的交易，只找也是分期類型的交易
  const existingTransactions = await Transaction.findAll({
    where: {
      userId,
      description: {
        [Op.or]: installments.map(({ tx }) => ({
          [Op.iLike]: `%${escapeLike(tx.description)}%`,
        })),
      },
      // 確保只比對有分期計畫或是分期類型的交易
      paymentFrequency: PaymentFrequency.INSTALLMENT,
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
  // 一次查完所有類別建議（per-user 隔離）
  const categoryMap = await batchSuggestCategories(
    userId,
    transactions.map((tx) => tx.description),
  );

  // 一次查完所有分期交易比對
  const installmentMap = await batchMatchInstallments(userId, transactions);

  // LLM 建議的類別名稱 → categoryId
  const llmCategoryMap = await batchMatchCategoriesByName(
    transactions.map((tx) => tx.suggestedCategory),
    userId,
  );

  const pendingRecords = transactions.map((tx, idx) => {
    const suggestedCategoryId = categoryMap.get(tx.description) || null;
    const matchedTransactionId = installmentMap.get(idx) || null;

    // 優先級：MerchantMapping → LLM 建議 → null
    const llmCategoryId = tx.suggestedCategory
      ? llmCategoryMap.get(tx.suggestedCategory) || null
      : null;
    const finalCategoryId = suggestedCategoryId || llmCategoryId;

    // 預設狀態判斷：
    // 1. 若有比對到現有交易 (matchedTransactionId 存在)，代表是已存在的未來帳款，預設「略過」(SKIPPED) 避免重複記帳
    // 2. 若是分期款 (isInstallment)，即使沒比對到，也預設「略過」，提示使用者應該另外去「建立分期計畫」而非當作單筆普通支出匯入
    const initialStatus =
      matchedTransactionId || tx.isInstallment
        ? PendingTransactionStatus.SKIPPED
        : PendingTransactionStatus.PENDING;

    return {
      userId,
      uploadBatchId: uploadId,
      rawMerchantName: tx.description,
      suggestedCategoryId: finalCategoryId,
      matchedTransactionId,
      isInstallment: tx.isInstallment,
      installmentNumber: tx.installmentCurrent,
      status: initialStatus,
      transactionData: {
        amount: tx.amount,
        type: tx.type,
        description: tx.description,
        date: tx.date,
        time:
          tx.time || new Date().toLocaleTimeString('en-GB', { hour12: false }), // 帳單沒時間時，補上解析完成時間
        accountId: null, // 用戶確認時選擇
        categoryId: finalCategoryId,
        extraAdd: tx.extraAdd,
        extraMinus: tx.extraMinus,
        currency: tx.currency,
      },
    };
  });

  await PendingTransaction.bulkCreate(pendingRecords);

  return pendingRecords.length;
};
