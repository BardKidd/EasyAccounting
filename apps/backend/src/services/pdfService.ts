import { v4 as uuidv4 } from 'uuid';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import {
  validateImageFiles,
  PDF_VALIDATION,
  PendingTransactionStatus,
  ParseStatus,
  TransactionType,
  PaymentFrequency,
  RootType,
  normalizeCurrencyCode,
  roundToBaseCurrency,
} from '@repo/shared';
import { Op } from 'sequelize';

import {
  PendingTransaction,
  Transaction,
  TransactionExtra,
  MerchantMapping,
  BillParseTelemetry,
  Account,
  User,
} from '@/models';
import { PendingTransactionAttributes } from '@/models/PendingTransaction';
import { getRate } from './exchangeRateService';
import sequelize from '@/utils/postgres';

//! azureBlob.ts 那邊當初寫的有點死，所以想說不要複用好了...

const CONNECTION_STRING = process.env.AZURE_BLOB_CONNECTION_STRING || '';
const CONTAINER_NAME = 'pdf-temp';

let containerClient: ContainerClient | null = null;

const getContainerClient = (): ContainerClient => {
  if (!containerClient) {
    if (!CONNECTION_STRING) {
      throw new Error('AZURE_BLOB_CONNECTION_STRING is not defined');
    }
    const blobServiceClient =
      BlobServiceClient.fromConnectionString(CONNECTION_STRING);
    containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
  }
  return containerClient;
};

/**
 * 上傳圖片到 pdf-temp container
 *
 * 本地模式：前端已把 PDF 轉成 JPEG，上傳多張圖片
 */
export const uploadImages = async (
  userId: string,
  files: Express.Multer.File[],
): Promise<{ uploadId: string; blobUrls: string[] }> => {
  const uploadId = uuidv4();
  const container = getContainerClient();
  const blobUrls: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    // 路徑格式：{userId}/{uploadId}/page-{index}.jpg
    const blobName = `${userId}/${uploadId}/page-${i}.jpg`;
    const blockBlobClient = container.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(file.buffer, {
      blobHTTPHeaders: {
        blobContentType: file.mimetype,
      },
    });

    blobUrls.push(blockBlobClient.url);
  }

  return { uploadId, blobUrls };
};

/**
 * 從 Blob 下載檔案到 Buffer
 */
export const downloadBlobToBuffer = async (
  blobUrl: string,
): Promise<Buffer> => {
  const container = getContainerClient();
  const urlObj = new URL(blobUrl);
  const blobName = urlObj.pathname.split('/').slice(2).join('/');
  const blockBlobClient = container.getBlockBlobClient(blobName);

  const downloadResponse = await blockBlobClient.download(0);
  const chunks: Buffer[] = [];

  for await (const chunk of downloadResponse.readableStreamBody as AsyncIterable<Buffer>) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
};

/**
 * 刪除某次上傳的所有暫存
 */
export const deleteTempBlobs = async (blobUrls: string[]): Promise<void> => {
  const container = getContainerClient();

  for (const url of blobUrls) {
    // 從 URL 取得 blob name（URL 格式：https://{account}.blob.core.windows.net/{container}/{blobName}）
    const urlObj = new URL(url);
    // pathName: /{container}/{blobName}，去掉 /{container}/
    const blobName = urlObj.pathname.split('/').slice(2).join('/');
    const blockBlobClient = container.getBlockBlobClient(blobName);

    await blockBlobClient.deleteIfExists();
  }
};

/**
 * 驗證上傳的圖片檔案
 */
export const validateUploadFiles = (
  files: Express.Multer.File[],
): { valid: boolean; error?: string } => {
  if (!files || files.length === 0) {
    return { valid: false, error: '未上傳任何檔案' };
  }

  const imageInfos = files.map((f) => ({
    size: f.size,
    type: f.mimetype,
  }));

  // 檢查 MIME type
  for (const img of imageInfos) {
    if (
      !(PDF_VALIDATION.allowedImageTypes as ReadonlyArray<string>).includes(
        img.type,
      )
    ) {
      return { valid: false, error: '只允許 JPEG 或 PNG 格式的圖片' };
    }
  }

  return validateImageFiles(imageInfos);
};

/**
 * 取得待確認交易列表
 */
export const getPendingTransactions = async (
  userId: string,
  query: { page?: number; limit?: number } = {},
) => {
  const page = query.page || 1;
  const limit = query.limit || 50;
  const offset = (page - 1) * limit;

  const { rows, count } = await PendingTransaction.findAndCountAll({
    where: {
      userId,
      status: {
        [Op.in]: [
          PendingTransactionStatus.PENDING,
          PendingTransactionStatus.SKIPPED,
        ],
      },
    },
    limit,
    offset,
    order: [['createdAt', 'ASC']],
  });

  return {
    data: rows,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  };
};

/**
 * 更新單筆待確認交易
 */
export const updatePendingTransaction = async (
  userId: string,
  id: string,
  data: Partial<PendingTransactionAttributes>,
) => {
  const transaction = await PendingTransaction.findOne({
    where: { id, userId },
  });

  if (!transaction) {
    throw new Error('Transaction not found');
  }

  // 只允許更新特定欄位
  const updateData: any = {};
  if (data.status) updateData.status = data.status;
  if (data.transactionData) {
    updateData.transactionData = {
      ...(transaction.transactionData as object),
      ...(data.transactionData as object),
    };
  }

  return transaction.update(updateData);
};

/**
 * 手動新增一筆待確認交易
 */
export const createPendingTransaction = async (
  userId: string,
  uploadBatchId: string | null,
) => {
  const now = new Date();
  const record = await PendingTransaction.create({
    userId,
    uploadBatchId: uploadBatchId || `manual-${Date.now()}`,
    rawMerchantName: '',
    suggestedCategoryId: null,
    matchedTransactionId: null,
    isInstallment: false,
    installmentNumber: null,
    status: PendingTransactionStatus.PENDING,
    transactionData: {
      amount: 0,
      type: 'expense' as any,
      description: '',
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString('en-GB', { hour12: false }),
      accountId: null,
      categoryId: null,
      extraAdd: 0,
      extraMinus: 0,
      currency: 'TWD',
    },
  });

  return record;
};

/**
 * 批次確認交易
 *
 * 流程：
 * 1. 查詢要確認的 pending transactions（PENDING 狀態）
 * 2. 寫入 Transaction 表
 * 3. 批次更新 MerchantMapping（按 merchantName+categoryId 分組 increment）
 * 4. 更新 Telemetry（補寫業務面欄位，Worker 已 create 技術面欄位）
 * 5. 刪除該 batch 的所有 pending（含 SKIPPED）
 */
export const confirmTransactions = async (
  userId: string,
  transactionIds: string[],
  accountId: string,
) => {
  const transaction = await sequelize.transaction();

  try {
    // 查詢要確認的（PENDING 狀態）
    const pendingTransactions = await PendingTransaction.findAll({
      where: {
        id: transactionIds,
        userId,
        status: PendingTransactionStatus.PENDING,
      },
      transaction,
    });

    if (pendingTransactions.length === 0) {
      throw new Error('No pending transactions found to confirm');
    }

    const uploadBatchId = pendingTransactions[0]!.uploadBatchId;

    // 取得同 batch 中 SKIPPED 的數量
    const skippedCount = await PendingTransaction.count({
      where: {
        uploadBatchId,
        userId,
        status: PendingTransactionStatus.SKIPPED,
      },
      transaction,
    });

    const createdTransactions = [];
    let modifiedCount = 0;

    // 收集 merchantMapping 更新（批次處理）
    const mappingCounts = new Map<string, number>();

    // 多幣別：目標帳戶幣別 + 使用者本位幣（整批同帳戶，先取一次）
    const targetAccount = await Account.findByPk(accountId, { transaction });
    const accountCurrency = (targetAccount as any)?.currencyCode || 'TWD';
    const userRow = await User.findByPk(userId, {
      attributes: ['baseCurrencyCode'],
      transaction,
    });
    const baseCurrencyCode = (userRow as any)?.baseCurrencyCode || 'TWD';

    for (const pt of pendingTransactions) {
      const data = pt.transactionData as any;
      const rawMerchantName = pt.rawMerchantName;
      const finalCategory = data.categoryId;

      // 多幣別解析：
      // - baseRate（帳戶幣別→本位幣）用交易日期匯率，驅動 amountInBase。
      // - 帳單原幣（LLM 解析的 currency）若與帳戶幣別不同，記為原幣事實；
      //   data.exchangeRate（原幣→帳戶幣別，前端確認時可補）存在則用它把原幣金額換算成帳戶幣金額。
      const billCurrency = data.currency
        ? normalizeCurrencyCode(data.currency)
        : accountCurrency;
      const txDate = data.date;
      const baseRate =
        accountCurrency === baseCurrencyCode
          ? 1
          : (await getRate(accountCurrency, baseCurrencyCode, txDate)) ?? 1;

      let amountInAccountCurrency = Number(data.amount) || 0;
      let originalCurrencyCode: string | null = null;
      let originalAmount: number | null = null;
      let exchangeRate: number | null = null;

      if (billCurrency && billCurrency !== accountCurrency) {
        originalCurrencyCode = billCurrency;
        originalAmount = Number(data.amount) || 0;
        // 原幣→帳戶幣別匯率：優先用前端確認時補的值，否則查匯率表
        exchangeRate =
          data.exchangeRate != null
            ? Number(data.exchangeRate)
            : await getRate(billCurrency, accountCurrency, txDate);
        if (exchangeRate != null) {
          amountInAccountCurrency = roundToBaseCurrency(
            originalAmount * exchangeRate,
          );
        }
        // 查無匯率時：保留原幣金額為帳戶幣金額（fallback），originalCurrencyCode 仍記錄事實
      }

      // 1. 建立 TransactionExtra (如果有)；本位幣快照 = 原值 × baseRate
      let transactionExtraId = null;
      if (data.extraAdd > 0 || data.extraMinus > 0) {
        const extraAdd = data.extraAdd || 0;
        const extraMinus = data.extraMinus || 0;
        const extra = await TransactionExtra.create(
          {
            extraAdd,
            extraMinus,
            extraAddLabel: '折扣',
            extraMinusLabel: '手續費',
            extraAddInBase: roundToBaseCurrency(extraAdd * baseRate),
            extraMinusInBase: roundToBaseCurrency(extraMinus * baseRate),
          },
          { transaction },
        );
        transactionExtraId = extra.id;
      }

      // 2. 建立 Transaction（amountInBase 由 hook 以 amount × baseRate 算出）
      const newTransaction = await Transaction.create(
        {
          userId,
          accountId,
          categoryId: data.categoryId,
          amount: amountInAccountCurrency,
          type: data.type as RootType,
          description: data.description,
          date: data.date,
          billingDate: data.date,
          time: data.time || '00:00:00',
          paymentFrequency: PaymentFrequency.ONE_TIME,
          transactionExtraId,
          baseRate,
          originalCurrencyCode,
          originalAmount,
          exchangeRate,
        },
        { transaction },
      );
      createdTransactions.push(newTransaction);

      // 收集 merchantMapping 計數
      if (finalCategory && rawMerchantName) {
        const key = `${rawMerchantName}::${finalCategory}`;
        mappingCounts.set(key, (mappingCounts.get(key) || 0) + 1);
      }

      // 檢查是否有修改（比較 AI 建議的 category 和最終 category）
      if (pt.suggestedCategoryId !== finalCategory) {
        modifiedCount++;
      }
    }

    // 3. 批次更新 MerchantMapping（用 raw query 做 upsert + increment）
    for (const [key, count] of mappingCounts) {
      const [merchantName, categoryId] = key.split('::');
      await sequelize.query(
        `INSERT INTO accounting.merchant_mapping ("id", "merchantName", "categoryId", "matchCount", "createdAt", "updatedAt")
         VALUES (:id, :merchantName, :categoryId, :count, NOW(), NOW())
         ON CONFLICT ("merchantName", "categoryId")
         DO UPDATE SET "matchCount" = accounting.merchant_mapping."matchCount" + :count,
                       "updatedAt" = NOW()`,
        {
          replacements: { id: uuidv4(), merchantName, categoryId, count },
          transaction,
        },
      );
    }

    // 4. 更新 Telemetry（Worker 已 create，這裡補寫業務面欄位）
    const telemetry = await BillParseTelemetry.findOne({
      where: { uploadBatchId },
      transaction,
    });

    if (telemetry) {
      const total = telemetry.totalTransactions || pendingTransactions.length;
      const accuracyRate = total > 0 ? (total - modifiedCount) / total : 0;

      await telemetry.update(
        {
          modifiedTransactions: modifiedCount,
          skippedTransactions: skippedCount,
          accuracyRate,
        },
        { transaction },
      );
    }

    // 5. 刪除該 batch 的所有 pending（含 SKIPPED）
    await PendingTransaction.destroy({
      where: {
        uploadBatchId,
        userId,
      },
      transaction,
    });

    await transaction.commit();

    return {
      created: createdTransactions.length,
      skipped: skippedCount,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * 清除用戶所有待確認交易
 *
 * 同時將 PROCESSING 狀態的 telemetry 標為 COMPLETED，
 * 避免下次進入頁面時 activeJob 誤判。
 */
export const clearPendingTransactions = async (userId: string) => {
  // 將殘留的 PROCESSING telemetry 標為 COMPLETED，避免 activeJob 誤判
  await BillParseTelemetry.update(
    { status: ParseStatus.COMPLETED },
    { where: { userId, status: ParseStatus.PROCESSING } },
  );

  return PendingTransaction.destroy({
    where: {
      userId,
      status: {
        [Op.in]: [
          PendingTransactionStatus.PENDING,
          PendingTransactionStatus.SKIPPED,
        ],
      },
    },
  });
};
