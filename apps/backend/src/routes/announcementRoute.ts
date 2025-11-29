import { Router } from 'express';
import announcementController from '../controllers/announcementController';
import { validate } from '../middlewares/validate';
import { postAnnouncementSchema, updateAnnouncementSchema } from '@repo/shared';

const router: Router = Router();

router.post(
  '/announcements',
  validate(postAnnouncementSchema),
  announcementController.createAnnouncement
);
router.get('/announcements', announcementController.getAnnouncements);
router.put(
  '/announcements/:id',
  validate(updateAnnouncementSchema),
  announcementController.updateAnnouncement
);
router.delete('/announcements/:id', announcementController.deleteAnnouncement);

export default router;
