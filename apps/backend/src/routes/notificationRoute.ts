import express, { Router } from 'express';
import { validate } from '@/middlewares/validate';
import { pushSubscriptionSchema, pushUnsubscribeSchema } from '@repo/shared';
import notificationController from '@/controllers/notificationController';
import { authMiddleware } from '@/middlewares/authMiddleware';

const router: Router = express.Router();

// 全部需登入：訂閱綁定當前使用者，勿信任 body.userId。
router.post(
  '/notifications/subscribe',
  authMiddleware,
  validate(pushSubscriptionSchema),
  notificationController.subscribe,
);

router.post(
  '/notifications/unsubscribe',
  authMiddleware,
  validate(pushUnsubscribeSchema),
  notificationController.unsubscribe,
);

router.get(
  '/notifications/status',
  authMiddleware,
  notificationController.status,
);

export default router;
