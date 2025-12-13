import express, { Router } from 'express';
import transactionController from '@/controllers/transactionController';
import { validate } from '@/middlewares/validate';
import {
  createTransactionSchema,
  updateTransactionSchema,
  getTransactionsByDateSchema,
} from '@repo/shared';
import { authMiddleware } from '@/middlewares/authMiddleware';
const router: Router = express.Router();

// 拿到整該年/月/日的交易
router.get(
  '/transaction/date',
  authMiddleware,
  validate(getTransactionsByDateSchema, 'query'),
  transactionController.getTransactionsByDate
);
// 某筆詳細資料
router.get(
  '/transaction/id/:id',
  authMiddleware,
  transactionController.getTransactionById
);
router.post(
  '/transaction',
  authMiddleware,
  validate(createTransactionSchema),
  transactionController.createTransaction
);
router.put(
  '/transaction/:id',
  authMiddleware,
  validate(updateTransactionSchema),
  transactionController.updateIncomeExpense
);
router.delete(
  '/transaction/:id',
  authMiddleware,
  transactionController.deleteTransaction
);

export default router;
