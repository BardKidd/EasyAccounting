import excelControllers from '@/controllers/excelControllers';
import { authMiddleware } from '@/middlewares/authMiddleware';
import express, { Router } from 'express';
import multer from 'multer';

const router: Router = express.Router();

// 上傳的檔案先儲存到記憶體，之後再上傳到 Blob 裡。
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get(
  '/excel/hyphen-string-categories',
  authMiddleware,
  excelControllers.getAllCategoriesHyphenString
);

router.get(
  '/excel/transaction-template',
  authMiddleware,
  excelControllers.exportTransactionsTemplateExcel
);

router.get(
  '/excel/user-transactions',
  authMiddleware,
  excelControllers.exportUserTransactionsExcel
);

router.post(
  '/excel/import-transactions',
  authMiddleware,
  upload.single('file'),
  excelControllers.importNewTransactionsExcel
);

export default router;
