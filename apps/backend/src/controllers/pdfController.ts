import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { simplifyTryCatch, responseHelper } from '@/utils/common';
import {
  uploadImages,
  uploadPdf,
  validateUploadFiles,
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
 * 接收前端上傳的圖片（本地模式）或 PDF（雲端模式）
 *
 * Query params:
 *   - mode: 'local' | 'cloud'（預設 'local'）
 *
 * Body: multipart/form-data
 *   - files: 圖片檔案（本地模式，多檔）或 PDF（雲端模式，單檔）
 */
const upload = async (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const userId = req.user.userId;
    const mode = (req.query.mode as string) === 'cloud' ? 'cloud' : 'local';
    const files = req.files as Express.Multer.File[];

    // 驗證
    const validation = validateUploadFiles(files, mode);
    if (!validation.valid) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(responseHelper(false, null, validation.error!, null));
    }

    if (mode === 'cloud') {
      // 雲端模式：上傳 PDF
      const { uploadId, blobUrl } = await uploadPdf(userId, files[0]!);

      return res
        .status(StatusCodes.OK)
        .json(
          responseHelper(
            true,
            { uploadId, blobUrl, mode },
            'PDF 上傳成功',
            null,
          ),
        );
    }

    // 本地模式：上傳圖片
    const { uploadId, blobUrls } = await uploadImages(userId, files);

    return res
      .status(StatusCodes.OK)
      .json(
        responseHelper(
          true,
          { uploadId, blobUrls, mode },
          '圖片上傳成功',
          null,
        ),
      );
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
    const processingMode = req.body.processingMode as 'local' | 'cloud';

    if (!uploadId || !blobUrls?.length || !processingMode) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          responseHelper(
            false,
            null,
            'Missing required fields: blobUrls, processingMode',
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
      processingMode,
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

export default { upload, stream, triggerParse };
