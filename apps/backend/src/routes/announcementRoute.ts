import { Router } from 'express';
import announcementController from '@/controllers/announcementController';
import { validate } from '@/middlewares/validate';
import { postAnnouncementSchema, updateAnnouncementSchema } from '@repo/shared';

const router: Router = Router();

router.post(
  '/announcement',
  validate(postAnnouncementSchema),
  announcementController.createAnnouncement
);
router.get('/announcement', announcementController.getAnnouncements);
router.put(
  '/announcement/:id',
  validate(updateAnnouncementSchema),
  announcementController.updateAnnouncement
);
router.delete('/announcement/:id', announcementController.deleteAnnouncement);

export default router;
