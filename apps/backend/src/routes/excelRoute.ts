import excelControllers from '@/controllers/excelControllers';
import { authMiddleware } from '@/middlewares/authMiddleware';
import express, { Router } from 'express';
import multer from 'multer';

const router: Router = express.Router();

// 上傳的檔案先儲存到記憶體，之後再上傳到 Blob 裡。
const storage = multer.memoryStorage();
// 安全性修正：限制上傳大小與檔案數，避免超大／zip-bomb xlsx 造成記憶體耗盡 DoS
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 1, // 單次僅接受一個檔案（對應 upload.single）
  },
});

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

router.get(
  '/excel/user-transactions-csv',
  authMiddleware,
  excelControllers.exportUserTransactionsCsv
);

router.post(
  '/excel/import-transactions',
  authMiddleware,
  upload.single('file'),
  excelControllers.importNewTransactionsExcel
);

export default router;
