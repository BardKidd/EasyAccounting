import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { simplifyTryCatch, responseHelper } from '@/utils/common';
import {
  uploadImages,
  validateUploadFiles,
  getPendingTransactions,
  updatePendingTransaction,
  confirmTransactions,
  clearPendingTransactions,
} from '@/services/pdfService';
import { sendParseMessage } from '@/utils/serviceBus';
import {
  getParseStatus,
  onStatusChange,
  updateParseStatus,
  ParseStatusData,
} from '@/utils/parseStatus';
import { ParseStatus } from '@repo/shared';

/**
 * POST /pdf/upload
 *
 * 接收前端上傳的圖片（前端已將 PDF 轉為 JPEG）
 *
 * Body: multipart/form-data
 *   - files: JPEG 圖片檔案（多檔）
 */
const upload = async (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const userId = req.user.userId;
    const files = req.files as Express.Multer.File[];

    // 驗證
    const validation = validateUploadFiles(files);
    if (!validation.valid) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(responseHelper(false, null, validation.error!, null));
    }

    const { uploadId, blobUrls } = await uploadImages(userId, files);

    return res
      .status(StatusCodes.OK)
      .json(responseHelper(true, { uploadId, blobUrls }, '圖片上傳成功', null));
  });
};

/**
 * GET /pdf/stream/:uploadId
 *
 * SSE (Server-Sent Events) endpoint
 * 前端透過 EventSource 連線，持續接收解析狀態更新
 *
 * Event format:
 *   event: status
 *   data: { "status": "processing", "progress": 60 }
 *
 *   event: error
 *   data: { "status": "failed", "error": "PDF 無法解析" }
 */
const stream = async (req: Request, res: Response) => {
  const uploadId = req.params.uploadId as string;

  // SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  // Helper：發送 SSE 事件
  const sendEvent = (data: ParseStatusData) => {
    const eventType = data.status === ParseStatus.FAILED ? 'error' : 'status';
    res.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // 1. 先發送目前的狀態（如果有的話）
  const currentStatus = getParseStatus(uploadId);
  if (currentStatus) {
    sendEvent(currentStatus);

    // 如果已經是終態，直接結束
    if (
      currentStatus.status === ParseStatus.COMPLETED ||
      currentStatus.status === ParseStatus.FAILED
    ) {
      res.end();
      return;
    }
  }

  // 2. 監聽後續狀態變更
  const cleanup = onStatusChange(uploadId, (data) => {
    sendEvent(data);

    // 終態：推送後關閉連線
    if (
      data.status === ParseStatus.COMPLETED ||
      data.status === ParseStatus.FAILED
    ) {
      res.end();
    }
  });

  // 3. 客戶端斷線時清理 listener
  req.on('close', () => {
    cleanup();
  });

  // 4. Heartbeat：每 30 秒送 comment 避免連線被中間層（nginx / cloudflare）超時斷掉
  // : 是 SSE 的 comment，不會被解析
  const ping = setInterval(() => {
    res.write(': ping\n\n');
  }, 30_000);

  req.on('close', () => {
    clearInterval(ping);
  });
};

/**
 * POST /pdf/parse/:uploadId
 *
 * 觸發 LLM 解析任務，將訊息放入 Service Bus Queue
 */
const triggerParse = async (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const uploadId = req.params.uploadId as string;
    const userId = req.user.userId;
    const blobUrls = req.body.blobUrls as string[];

    if (!uploadId || !blobUrls?.length) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          responseHelper(
            false,
            null,
            'Missing required fields: blobUrls',
            null,
          ),
        );
    }

    // 設定初始狀態
    updateParseStatus({
      uploadId,
      status: ParseStatus.QUEUED,
    });

    // 丟進 Service Bus Queue
    await sendParseMessage({
      uploadId,
      userId,
      blobUrls,
      processingMode: 'local',
    });

    return res
      .status(StatusCodes.OK)
      .json(
        responseHelper(
          true,
          { uploadId, status: ParseStatus.QUEUED },
          'Parse job queued',
          null,
        ),
      );
  });
};

/**
 * GET /pdf/pending
 *
 * 取得待確認交易列表
 */
const getPending = async (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const userId = req.user.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await getPendingTransactions(userId, { page, limit });

    return res
      .status(StatusCodes.OK)
      .json(
        responseHelper(
          true,
          result,
          'Fetch pending transactions success',
          null,
        ),
      );
  });
};

/**
 * PATCH /pdf/pending/:id
 *
 * 更新單筆待確認交易
 */
const updatePending = async (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const userId = req.user.userId;
    const id = req.params.id as string;
    const data = req.body;

    const updated = await updatePendingTransaction(userId, id, data);

    return res
      .status(StatusCodes.OK)
      .json(
        responseHelper(
          true,
          updated,
          'Update pending transaction success',
          null,
        ),
      );
  });
};

/**
 * POST /pdf/confirm
 *
 * 批次確認交易
 * body: { transactionIds: string[] }
 */
const confirm = async (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const userId = req.user.userId;
    const transactionIds = req.body.transactionIds as string[];
    const accountId = req.body.accountId as string;

    if (
      !transactionIds ||
      !Array.isArray(transactionIds) ||
      transactionIds.length === 0
    ) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(responseHelper(false, null, 'transactionIds is required', null));
    }

    if (!accountId) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(responseHelper(false, null, '請先選擇匯入帳戶', null));
    }

    const result = await confirmTransactions(userId, transactionIds, accountId);

    return res
      .status(StatusCodes.OK)
      .json(
        responseHelper(
          true,
          result,
          `Confirmed ${result.count} transactions`,
          null,
        ),
      );
  });
};

/**
 * DELETE /pdf/pending
 *
 * 清除所有待確認交易
 */
const clearPending = async (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const userId = req.user.userId;
    await clearPendingTransactions(userId);

    return res
      .status(StatusCodes.OK)
      .json(
        responseHelper(true, null, 'All pending transactions cleared', null),
      );
  });
};

export default {
  upload,
  stream,
  triggerParse,
  getPending,
  updatePending,
  confirm,
  clearPending,
};
