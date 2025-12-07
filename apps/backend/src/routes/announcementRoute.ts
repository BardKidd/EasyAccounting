import { Router } from 'express';
import announcementController from '@/controllers/announcementController';
import { validate } from '@/middlewares/validate';
import { postAnnouncementSchema, updateAnnouncementSchema } from '@repo/shared';
import { authMiddleware } from '@/middlewares/authMiddleware';

const router: Router = Router();

router.post(
  '/announcement',
  authMiddleware,
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
  validate(updateAnnouncementSchema),
  announcementController.updateAnnouncement
);
router.delete(
  '/announcement/:id',
  authMiddleware,
  announcementController.deleteAnnouncement
);

export default router;
