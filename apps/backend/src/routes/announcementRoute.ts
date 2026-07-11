import { Router } from 'express';
import announcementController from '@/controllers/announcementController';
import { validate } from '@/middlewares/validate';
import { postAnnouncementSchema, updateAnnouncementSchema } from '@repo/shared';
import { authMiddleware } from '@/middlewares/authMiddleware';
import { requireAdmin } from '@/middlewares/requireAdmin';

const router: Router = Router();

// 安全性(#9)：公告增改刪需 admin；讀取維持一般登入即可。
router.post(
  '/announcement',
  authMiddleware,
  requireAdmin,
  validate(postAnnouncementSchema),
  announcementController.createAnnouncement
);
router.get(
  '/announcement',
  authMiddleware,
  announcementController.getAnnouncements
);
router.put(
  '/announcement/:id',
  authMiddleware,
  requireAdmin,
  validate(updateAnnouncementSchema),
  announcementController.updateAnnouncement
);
router.delete(
  '/announcement/:id',
  authMiddleware,
  requireAdmin,
  announcementController.deleteAnnouncement
);

export default router;
