import express, { Router } from 'express';
import { validate } from '@/middlewares/validate';
import { personnelNotificationSchema } from '@repo/shared';
import personnelNotificationController from '@/controllers/personnelNotificationController';
import { authMiddleware } from '@/middlewares/authMiddleware';

const router: Router = express.Router();

router.post(
  '/personnel-notification',
  authMiddleware, // 安全性修復：POST 原本未驗證，攻擊者可為任意 userId 寫入設定
  validate(personnelNotificationSchema),
  personnelNotificationController.postPersonnelNotification
);

router.get(
  '/personnel-notification',
  authMiddleware,
  personnelNotificationController.getPersonnelNotification
);

router.put(
  '/personnel-notification',
  authMiddleware,
  validate(personnelNotificationSchema),
  personnelNotificationController.putPersonnelNotification
);

export default router;
