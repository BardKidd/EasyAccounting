import { v4 as uuidv4 } from 'uuid';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import {
  validatePdfFile,
  validateImageFiles,
  PDF_VALIDATION,
  PendingTransactionStatus,
  TransactionType,
  PaymentFrequency,
  RootType,
} from '@repo/shared';

import PendingTransaction, {
  PendingTransactionAttributes,
} from '@/models/PendingTransaction';
import Transaction from '@/models/transaction';
import TransactionExtra from '@/models/TransactionExtra';
import MerchantMapping from '@/models/MerchantMapping';
import BillParseTelemetry from '@/models/BillParseTelemetry';
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
 * 雲端模式：前端上傳 PDF，後端處理（Phase 2 再實作轉檔邏輯）
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
 * 上傳 PDF 到 pdf-temp container（雲端模式）
 */
export const uploadPdf = async (
  userId: string,
  file: Express.Multer.File,
): Promise<{ uploadId: string; blobUrl: string }> => {
  const uploadId = uuidv4();
  const container = getContainerClient();
  const blobName = `${userId}/${uploadId}/original.pdf`;
  const blockBlobClient = container.getBlockBlobClient(blobName);

  await blockBlobClient.uploadData(file.buffer, {
    blobHTTPHeaders: {
      blobContentType: 'application/pdf',
    },
  });

  return { uploadId, blobUrl: blockBlobClient.url };
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
 * 雲端模式：PDF → JPEG 圖片 Buffer[]
 *
 * 使用 pdfjs-dist 解析 PDF，node-canvas 渲染成圖片
 */
export const convertPdfToImages = async (
  pdfBuffer: Buffer,
  password?: string,
): Promise<Buffer[]> => {
  // Dynamic import to avoid loading heavy dependencies when not needed
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const canvasMod = await import('canvas');
  const { createCanvas, Image, ImageData } = canvasMod;

  // Polyfills for node-canvas interaction
  // pdfjs-dist v4+ requires stricter globals in Node environment
  // @ts-ignore
  if (!global.Image) global.Image = Image;
  // @ts-ignore
  if (!global.createCanvas) global.createCanvas = createCanvas;
  // @ts-ignore
  if (!global.ImageData) global.ImageData = ImageData;

  // Define NodeCanvasFactory
  const NodeCanvasFactory = {
    create: function (width: number, height: number) {
      const canvas = createCanvas(width, height);
      const context = canvas.getContext('2d');
      return {
        canvas: canvas,
        context: context,
      };
    },
    reset: function (canvasAndContext: any, width: number, height: number) {
      canvasAndContext.canvas.width = width;
      canvasAndContext.canvas.height = height;
    },
    destroy: function (canvasAndContext: any) {
      canvasAndContext.canvas.width = 0;
      canvasAndContext.canvas.height = 0;
      canvasAndContext.canvas = null;
      canvasAndContext.context = null;
    },
  };

  try {
    const uint8Array = new Uint8Array(pdfBuffer);
    const pdf = await pdfjsLib.getDocument({
      data: uint8Array,
      password: password,
      // @ts-ignore
      canvasFactory: NodeCanvasFactory,
      // Disable worker to avoid worker-loader issues in node
      disableFontFace: true, // Sometimes fonts cause issues in node
    }).promise;

    const images: Buffer[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      // scale: 2.0 代表圖片會是原始 PDF 尺寸的 2 倍大，讓 LLM 更容易看清楚
      const viewport = page.getViewport({ scale: 2.0 });

      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');

      await page.render({
        canvasContext: context as any, // Cast to any to avoid type mismatch with DOM types
        viewport,
        // @ts-ignore
        canvasFactory: NodeCanvasFactory,
      }).promise;

      // Convert to JPEG Buffer
      const jpegBuffer = canvas.toBuffer('image/jpeg', { quality: 0.85 });
      images.push(jpegBuffer);

      // Cleanup
      page.cleanup();
    }

    return images;
  } catch (error) {
    console.error('[PDF Service] Convert failed:', error);
    throw error;
  }
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
 * 驗證上傳的檔案
 */
export const validateUploadFiles = (
  files: Express.Multer.File[],
  mode: 'local' | 'cloud',
): { valid: boolean; error?: string } => {
  if (!files || files.length === 0) {
    return { valid: false, error: '未上傳任何檔案' };
  }

  if (mode === 'cloud') {
    // 雲端模式：只接受一個 PDF
    if (files.length !== 1) {
      return { valid: false, error: '雲端模式只能上傳一個 PDF 檔案' };
    }
    const file = files[0]!;

    // 透過檔案格式該投的固定簽名來判斷，而不是從副檔名
    // https://en.wikipedia.org/wiki/List_of_file_signatures
    const header = file.buffer.subarray(0, 5).toString();
    if (header !== '%PDF-') {
      return { valid: false, error: '檔案不是有效的 PDF' };
    }

    return validatePdfFile({ size: file.size, type: file.mimetype });
  }

  // 本地模式：接受多張圖片
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
      status: PendingTransactionStatus.PENDING,
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
 * 批次確認交易
 * 1. 寫入 Transaction 表
 * 2. 更新 MerchantMapping
 * 3. 記錄 Telemetry
 * 4. 刪除 PendingTransaction
 */
export const confirmTransactions = async (
  userId: string,
  transactionIds: string[],
) => {
  const transaction = await sequelize.transaction();

  try {
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

    const createdTransactions = [];
    let modifiedCount = 0;

    for (const pt of pendingTransactions) {
      const data = pt.transactionData as any;
      const rawMerchantName = pt.rawMerchantName;
      const finalCategory = data.categoryId;

      // 1. 建立 TransactionExtra (如果有)
      let transactionExtraId = null;
      if (data.extraAdd > 0 || data.extraMinus > 0) {
        const extra = await TransactionExtra.create(
          {
            extraAdd: data.extraAdd || 0,
            extraMinus: data.extraMinus || 0,
            extraAddLabel: '折扣', // 預設
            extraMinusLabel: '手續費', // 預設
          },
          { transaction },
        );
        transactionExtraId = extra.id;
      }

      // 2. 建立 Transaction
      const newTransaction = await Transaction.create(
        {
          userId,
          accountId: data.accountId,
          categoryId: data.categoryId,
          amount: data.amount,
          type: data.type as RootType,
          description: data.description,
          date: data.date,
          billingDate: data.date, // 信用卡通常消費日=入帳日(暫定)，或需另外欄位
          time: data.time || '00:00:00',
          paymentFrequency: PaymentFrequency.ONE_TIME, // 暫時都當 One Time，分期需另外處理
          transactionExtraId,
        },
        { transaction },
      );
      createdTransactions.push(newTransaction);

      // 3. 更新 MerchantMapping (如果類別有變更或單純增加權重)
      if (finalCategory) {
        await MerchantMapping.upsert(
          {
            merchantName: rawMerchantName,
            categoryId: finalCategory,
            matchCount: 1, // upsert 會處理 increment? Sequelize upsert 預設是 update，但需配合 logic
            // 這裡用 raw query 可能比較好做 increment，或者先查再改
            // 簡化：先做單純 upsert reset 或 increment
            // 為了效能，這裡暫時只做 "如果不存在則建立，存在則不動(或加1)"
            // Sequelize upsert return [instance, created]
          },
          {
            transaction,
            fields: ['merchantName', 'categoryId'], // 衝突時更新這些 (其實都不用變)
            conflictFields: ['merchantName', 'categoryId'],
          } as any, // Type definition workaround
        );

        // 手動 increment matchCount
        // 因為 upsert 在 postgres 是 ON CONFLICT DO UPDATE
        await MerchantMapping.increment('matchCount', {
          by: 1,
          where: {
            merchantName: rawMerchantName,
            categoryId: finalCategory,
          },
          transaction,
        });
      }

      // 檢查是否有修改 (比較原始 suggestedCategoryId 和最終 categoryId，或其他欄位)
      // 這邊只能概略判斷：如果有 user 介入修改 category，或者 amount/date 變了
      if (pt.suggestedCategoryId !== finalCategory) {
        modifiedCount++;
      }
    }

    const skippedTransactions = await PendingTransaction.count({
      where: {
        id: transactionIds,
        userId,
        status: PendingTransactionStatus.SKIPPED,
      },
      transaction,
    });

    // 4. 記錄 Telemetry
    // 假設同一批 uploadId 是一次 parsing session
    // 我們可以從 pendingTransactions[0] 拿到 uploadBatchId
    if (pendingTransactions.length > 0) {
      const uploadBatchId = pendingTransactions[0]!.uploadBatchId;
      // 這裡 logic 其實有點怪，因為 confirm 是 transaction level，而 telemetry 應該是 batch level
      // 但如果 user 分批 confirm，telemetry 會被拆散？
      // 暫時解法：每次 confirm 都記一筆，還是 update 既有的？
      // 為了簡單，我們先記一筆新的 "Action Log" 概念，或者 update 既有的 telemetry (如果我們有 create init record)
      // 根據 BillParseTelemetry model，它有 uploadBatchId。
      // 我們用 upsert 來累加？ Or just create new record for this confirmation action?
      // BillParseTelemetry 似乎設計為 One-to-One with UploadBatch?
      // 若是 One-to-One，我們應該用 update.

      // 嘗試找現有的 record (created at parse time?) -> 目前 parse time 沒 create telemetry.
      // Let's create or increment.

      const telemetry = await BillParseTelemetry.findOne({
        where: { uploadBatchId },
        transaction,
      });

      if (telemetry) {
        await telemetry.increment(
          {
            totalTransactions: createdTransactions.length, // 累加確認的數量
            modifiedTransactions: modifiedCount,
            skippedTransactions: skippedTransactions,
          },
          { transaction },
        );
      } else {
        await BillParseTelemetry.create(
          {
            uploadBatchId,
            totalTransactions: createdTransactions.length,
            modifiedTransactions: modifiedCount,
            skippedTransactions: skippedTransactions,
            // 其他欄位需在 parse 階段寫入，這裡可能拿不到
          },
          { transaction },
        );
      }
    }

    // 4. 刪除已確認的 PendingTransactions
    await PendingTransaction.destroy({
      where: {
        id: pendingTransactions.map((pt) => pt.id),
      },
      transaction,
    });

    // 5. Commit
    await transaction.commit();

    return {
      count: createdTransactions.length,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * 清除用戶所有待確認交易
 */
export const clearPendingTransactions = async (userId: string) => {
  return PendingTransaction.destroy({
    where: {
      userId,
      status: PendingTransactionStatus.PENDING,
    },
  });
};
