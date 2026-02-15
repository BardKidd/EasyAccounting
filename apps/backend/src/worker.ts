import {
  startWorker,
  BillParseMessage,
  closeServiceBus,
} from '@/utils/serviceBus';
import { updateParseStatus } from '@/utils/parseStatus';
import {
  downloadBlobToBuffer,
  convertPdfToImages,
  deleteTempBlobs,
} from '@/services/pdfService';
import { parseImages } from '@/services/openRouterService';
import {
  saveParsedResults,
  buildCategoryListForPrompt,
} from '@/services/billParseService';
import BillParseTelemetry from '@/models/BillParseTelemetry';
import { ParseStatus } from '@repo/shared';

/**
 * Bill Parse Worker
 *
 * 在 API process 內啟動，從 Service Bus Queue 消費訊息
 * 與 SSE 共用同一個 EventEmitter（同 process 架構）
 *
 * 流程：
 * 1. 收到訊息 → 更新狀態 PROCESSING
 * 2. 雲端模式：下載 PDF → 轉圖片
 * 3. 送圖片給 Groq 解析
 * 4. 存入 pending_transaction
 * 5. 清除 Blob 暫存
 * 6. 更新狀態 COMPLETED
 */

const processMessage = async (message: BillParseMessage) => {
  const { uploadId, userId, blobUrls, processingMode } = message;
  const startTime = Date.now();

  console.log(`[Worker] Processing ${uploadId} (mode: ${processingMode})`);

  try {
    // 1. 更新狀態為 PROCESSING
    updateParseStatus({
      uploadId,
      status: ParseStatus.PROCESSING,
      progress: 0,
    });

    // 2. 取得圖片 buffers
    let imageBuffers: Buffer[];

    if (processingMode === 'cloud') {
      // 雲端模式：從 Blob 下載 PDF → 轉圖片
      updateParseStatus({
        uploadId,
        status: ParseStatus.PROCESSING,
        progress: 10,
      });

      const pdfBuffer = await downloadBlobToBuffer(blobUrls[0]!);
      updateParseStatus({
        uploadId,
        status: ParseStatus.PROCESSING,
        progress: 20,
      });

      try {
        imageBuffers = await convertPdfToImages(pdfBuffer, message.password);
      } catch (err: any) {
        if (err.name === 'PasswordException' || err.code === 1) {
          console.warn(`[Worker] ${uploadId} requires password`);
          updateParseStatus({
            uploadId,
            status: ParseStatus.PASSWORD_REQUIRED,
            error: 'Password required',
          });
          return;
        }
        throw err;
      }

      updateParseStatus({
        uploadId,
        status: ParseStatus.PROCESSING,
        progress: 30,
      });
    } else {
      // 本地模式：前端已轉好圖片，從 Blob 下載 JPEG
      const downloadPromises = blobUrls.map((url) => downloadBlobToBuffer(url));
      imageBuffers = await Promise.all(downloadPromises);
      updateParseStatus({
        uploadId,
        status: ParseStatus.PROCESSING,
        progress: 30,
      });
    }

    // 3. 送圖片給 LLM 解析
    updateParseStatus({
      uploadId,
      status: ParseStatus.PROCESSING,
      progress: 40,
    });

    // 建立類別清單給 LLM prompt
    const categoryList = await buildCategoryListForPrompt(userId);
    console.log(
      `[Worker] Category list for prompt (${categoryList.split('\n').length} items)`,
    );

    const { transactions, pageCount, provider, model } = await parseImages(
      imageBuffers,
      categoryList || null,
    );

    updateParseStatus({
      uploadId,
      status: ParseStatus.PROCESSING,
      progress: 80,
    });

    // 如果圖片中抓不到任何交易資訊的話直接停止。
    if (transactions.length === 0) {
      console.warn(`[Worker] ${uploadId}: No transactions found`);
      // 即使沒有交易也要清除暫存
      await deleteTempBlobs(blobUrls);
      updateParseStatus({
        uploadId,
        status: ParseStatus.COMPLETED,
        pendingCount: 0,
      });
      return;
    }

    // 4. 存入 pending_transaction
    const pendingCount = await saveParsedResults(
      uploadId,
      userId,
      transactions,
    );
    updateParseStatus({
      uploadId,
      status: ParseStatus.PROCESSING,
      progress: 90,
    });

    // 5. 清除 Blob 暫存
    await deleteTempBlobs(blobUrls);

    // 6. 記錄 telemetry
    await BillParseTelemetry.create({
      uploadBatchId: uploadId,
      totalTransactions: pendingCount,
      parseTimeMs: Date.now() - startTime,
      processingMode,
      llmProvider: provider,
      llmModel: model,
      pageCount,
    });

    // 7. 完成
    updateParseStatus({
      uploadId,
      status: ParseStatus.COMPLETED,
      pendingCount,
    });

    console.log(
      `[Worker] ${uploadId} completed: ${pendingCount} transactions in ${Date.now() - startTime}ms`,
    );
  } catch (error) {
    console.error(`[Worker] ${uploadId} failed:`, error);
    updateParseStatus({
      uploadId,
      status: ParseStatus.FAILED,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * 在 API process 啟動時呼叫
 *
 * ```ts
 * in app.ts
 * import { initBillParseWorker } from '@/worker';
 * initBillParseWorker();
 * ```
 */
export const initBillParseWorker = () => {
  console.log('[Worker] Starting bill parse worker...');

  const receiver = startWorker({
    processMessage,
    processError: async (error: Error) => {
      console.error('[Worker] Service Bus error:', error);
    },
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('[Worker] Shutting down...');
    await receiver.close();
    await closeServiceBus();
  };

  process.on('SIGTERM', shutdown); // 終端機停止時發出的訊號
  process.on('SIGINT', shutdown); // 程式被中斷時發出的訊號
};
