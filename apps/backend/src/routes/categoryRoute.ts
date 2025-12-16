import express, { Router } from 'express';
import categoryController from '@/controllers/categoryController';
import { validate } from '@/middlewares/validate';
import { createCategorySchema, updateCategorySchema } from '@repo/shared';
import { authMiddleware } from '@/middlewares/authMiddleware';

const router: Router = express.Router();

router.get('/category', authMiddleware, categoryController.getAllCategories);

router.post(
  '/category',
  authMiddleware,
  validate(createCategorySchema),
  categoryController.postCategory
);

router.put(
  '/category/:id',
  authMiddleware,
  validate(updateCategorySchema),
  categoryController.putCategory
);
router.delete(
  '/category/:id',
  authMiddleware,
  categoryController.deleteCategory
);

export default router;
