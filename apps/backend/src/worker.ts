import {
  startWorker,
  BillParseMessage,
  closeServiceBus,
} from '@/utils/serviceBus';
import { updateParseStatus } from '@/utils/parseStatus';
import { downloadBlobToBuffer, deleteTempBlobs } from '@/services/pdfService';
import { parseImages } from '@/services/openRouterService';
import {
  saveParsedResults,
  buildCategoryListForPrompt,
} from '@/services/billParseService';
import BillParseTelemetry from '@/models/BillParseTelemetry';
import User from '@/models/user';
import emailService from '@/services/emailService';
import { ParseStatus } from '@repo/shared';

/**
 * Bill Parse Worker
 *
 * 在 API process 內啟動，從 Service Bus Queue 消費訊息
 * 與 SSE 共用同一個 EventEmitter（同 process 架構）
 *
 * 流程：
 * 1. 收到訊息 → 更新狀態 PROCESSING
 * 2. 從 Blob 下載圖片（前端已轉好）
 * 3. 送圖片給 LLM 解析
 * 4. 存入 pending_transaction
 * 5. 清除 Blob 暫存
 * 6. 更新 Telemetry 表狀態為 COMPLETED
 * 7. (Optional) 如果有勾選，寄送 Email 通知
 */

const processMessage = async (message: BillParseMessage) => {
  const { uploadId, userId, blobUrls } = message;
  const startTime = Date.now();

  console.log(`[Worker] Processing ${uploadId}`);

  try {
    // 1. 更新狀態為 PROCESSING (SSE)
    updateParseStatus({
      uploadId,
      status: ParseStatus.PROCESSING,
      progress: 0,
    });

    // 取得 Telemetry Task Record 以決定是否要記信
    const taskRecord = await BillParseTelemetry.findOne({
      where: { uploadBatchId: uploadId, userId },
    });

    // 2. 從 Blob 下載圖片（前端已轉好）
    const downloadPromises = blobUrls.map((url) => downloadBlobToBuffer(url));
    const imageBuffers = await Promise.all(downloadPromises);
    updateParseStatus({
      uploadId,
      status: ParseStatus.PROCESSING,
      progress: 30,
    });

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

      // 更新 Telemetry 狀態為 COMPLETED
      if (taskRecord) {
        await taskRecord.update({
          status: ParseStatus.COMPLETED,
          parseTimeMs: Date.now() - startTime,
          processingMode: 'local',
          llmProvider: provider,
          llmModel: model,
          pageCount,
        });
      }

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

    // 6. 更新 telemetry，並設為 COMPLETED
    if (taskRecord) {
      await taskRecord.update({
        status: ParseStatus.COMPLETED,
        totalTransactions: pendingCount,
        parseTimeMs: Date.now() - startTime,
        processingMode: 'local',
        llmProvider: provider,
        llmModel: model,
        pageCount,
      });
      // 7. 若有勾選寄出 Email，可以在這裡觸發寄信
      if (taskRecord.notifyEmail) {
        console.log(
          `[Worker] Sending completion email for ${uploadId} to User ${userId}`,
        );
        try {
          const user = await User.findByPk(userId);
          if (user && user.email) {
            await emailService.sendBillParseCompleteEmail({
              userName: user.name,
              to: user.email,
              transactionCount: pendingCount,
            });
          }
        } catch (emailError) {
          console.error('[Worker] Failed to send email', emailError);
        }
      }
    }

    // 7. 完成 (SSE)
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

    const taskRecord = await BillParseTelemetry.findOne({
      where: { uploadBatchId: uploadId, userId },
    });
    if (taskRecord) {
      await taskRecord.update({ status: ParseStatus.FAILED });
    }
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
