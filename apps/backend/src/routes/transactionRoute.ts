import express, { Router } from 'express';
import transactionController from '@/controllers/transactionController';
import { validate } from '@/middlewares/validate';
import {
  createTransactionSchema,
  updateTransactionSchema,
  getTransactionsByDateSchema,
} from '@repo/shared';
const router: Router = express.Router();

// 拿到整該年/月/日的交易
router.get(
  '/transaction/:date',
  validate(getTransactionsByDateSchema),
  transactionController.getTransactionsByDate
);
// 某筆詳細資料
// router.get('/transaction/:id', transactionController.getTransactionById);
// router.post(
//   '/transaction',
//   validate(createTransactionSchema),
//   transactionController.createTransaction
// );
router.post(
  '/transaction',
  validate(createTransactionSchema),
  transactionController.createTransaction
);
// router.put(
//   '/transaction/:id',
//   validate(updateTransactionSchema),
//   transactionController.updateTransaction
// );
// router.delete('/transaction/:id', transactionController.deleteTransaction);

export default router;
