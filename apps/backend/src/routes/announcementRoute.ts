import { Router } from 'express';
import announcementController from '../controllers/announcementController';
import { validate } from '../middlewares/validate';
import { postAnnouncementSchema } from '@repo/shared';

const router: Router = Router();

router.post(
  '/announcements',
  validate(postAnnouncementSchema),
  announcementController.createAnnouncement
);
router.get('/announcements', announcementController.getAnnouncements);

export default router;
