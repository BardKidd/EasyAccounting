import pdfController from '@/controllers/pdfController';
import { authMiddleware } from '@/middlewares/authMiddleware';
import express, { Router } from 'express';
import multer from 'multer';

const router: Router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 50, // 最多 50 個檔案（對應 PDF_VALIDATION.maxImageCount）
  },
});

router.post(
  '/pdf/upload',
  authMiddleware,
  upload.array('files'),
  pdfController.upload,
);

router.get('/pdf/stream/:uploadId', authMiddleware, pdfController.stream);

// 觸發解析（需 auth）
router.post('/pdf/parse/:uploadId', authMiddleware, pdfController.triggerParse);

// Phase 3: 待確認交易管理
router.get('/pdf/pending', authMiddleware, pdfController.getPending);
router.patch('/pdf/pending/:id', authMiddleware, pdfController.updatePending);
router.post('/pdf/confirm', authMiddleware, pdfController.confirm);
router.delete('/pdf/pending', authMiddleware, pdfController.clearPending);

export default router;
