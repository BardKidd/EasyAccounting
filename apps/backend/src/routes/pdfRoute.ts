import pdfController from '@/controllers/pdfController';
import { authMiddleware } from '@/middlewares/authMiddleware';
import express, { Router } from 'express';
import multer from 'multer';

const router: Router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // [security] 對齊實際每張圖片 5MB 上限，避免驗證前緩衝過大（原為 10MB）
    files: 50, // 最多 50 個檔案（對應 PDF_VALIDATION.maxImageCount）
  },
});

// 1. 上傳 PDF 轉換後的多張圖片（或其他圖檔）到 Azure Blob Storage，並建立解析任務的資料庫記錄
router.post(
  '/pdf/upload',
  authMiddleware,
  upload.array('files'),
  pdfController.upload,
);

// 2. 透過 Server-Sent Events (SSE) 取得特定上傳任務的即時解析進度狀態
router.get('/pdf/stream/:uploadId', authMiddleware, pdfController.stream);

// 3. 觸發 AI 解析流程：發送訊息到 Service Bus Queue，由背景 Worker 進行處理
router.post('/pdf/parse/:uploadId', authMiddleware, pdfController.triggerParse);

// 4. 取得目前使用者所有尚未確認（狀態不為 CONFIRMED 或 SKIPPED）的待辦交易清單
router.get('/pdf/pending', authMiddleware, pdfController.getPending);

// 5. 手動新增一筆空白的待確認交易（供使用者自己補登遺漏的帳單項目）
router.post('/pdf/pending', authMiddleware, pdfController.createPending);

// 6. 更新特定待確認交易的內容（例如：使用者修改 AI 辨識錯誤的金額或名稱）
router.patch('/pdf/pending/:id', authMiddleware, pdfController.updatePending);

// 7. 將選定的待確認交易正式匯入到使用者的記帳帳戶中（轉為正式 Transaction）
router.post('/pdf/confirm', authMiddleware, pdfController.confirm);

// 8. 捨棄所有待確認交易，清空當前的解析工作階段
router.delete('/pdf/pending', authMiddleware, pdfController.clearPending);

export default router;
