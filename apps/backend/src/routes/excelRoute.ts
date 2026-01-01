import excelControllers from '@/controllers/excelControllers';
import { authMiddleware } from '@/middlewares/authMiddleware';
import express, { Router } from 'express';

const router: Router = express.Router();

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

export default router;
