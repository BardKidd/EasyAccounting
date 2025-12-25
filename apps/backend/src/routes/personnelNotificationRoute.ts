import express, { Router } from 'express';
import { validate } from '@/middlewares/validate';
import { personnelNotificationSchema } from '@repo/shared';
import personnelNotificationController from '@/controllers/personnelNotificationController';

const router: Router = express.Router();

router.post(
  '/personnel-notification',
  validate(personnelNotificationSchema),
  personnelNotificationController.postPersonnelNotification
);

export default router;
