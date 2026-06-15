import express, { Router } from 'express';
import { validate } from '@/middlewares/validate';
import {
  createTagSchema,
  updateTagSchema,
  tagIdParamSchema,
  listTagsQuerySchema,
} from '@repo/shared';
import tagController from '@/controllers/tagController';
import { authMiddleware } from '@/middlewares/authMiddleware';

const router: Router = express.Router();

router.get(
  '/tags',
  authMiddleware,
  validate(listTagsQuerySchema, 'query'),
  tagController.listTags,
);

router.post(
  '/tags',
  authMiddleware,
  validate(createTagSchema),
  tagController.createTag,
);

router.put(
  '/tags/:id',
  authMiddleware,
  validate(tagIdParamSchema, 'params'),
  validate(updateTagSchema),
  tagController.updateTag,
);

router.delete(
  '/tags/:id',
  authMiddleware,
  validate(tagIdParamSchema, 'params'),
  tagController.deleteTag,
);

export default router;
