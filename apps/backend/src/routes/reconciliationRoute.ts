import express, { Router } from 'express';
import reconciliationController from '@/controllers/reconciliationController';
import { authMiddleware } from '@/middlewares/authMiddleware';

const router: Router = express.Router();

router.get(
  '/notifications/reconciliation',
  authMiddleware,
  reconciliationController.getReconciliationNotifications
);

router.get(
  '/reconciliation/:accountId',
  authMiddleware,
  reconciliationController.getReconciliationData
);

router.post(
  '/reconciliation/:accountId/confirm',
  authMiddleware,
  reconciliationController.confirmReconciliation
);

export default router;
