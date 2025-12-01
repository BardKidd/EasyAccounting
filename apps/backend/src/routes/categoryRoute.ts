import express, { Router } from 'express';
import categoryController from '@/controllers/categoryController';
import { validate } from '@/middlewares/validate';
import { createCategorySchema, updateCategorySchema } from '@repo/shared';

const router: Router = express.Router();

router.get('/category', categoryController.getAllCategories);
router.get('/category/:id', categoryController.getChildrenCategories);
router.post(
  '/category',
  validate(createCategorySchema),
  categoryController.postCategory
);

router.put(
  '/category/:id',
  validate(updateCategorySchema),
  categoryController.putCategory
);
router.delete('/category/:id', categoryController.deleteCategory);

export default router;
