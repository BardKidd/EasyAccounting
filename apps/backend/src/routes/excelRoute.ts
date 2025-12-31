import excelControllers from '@/controllers/excelControllers';
import { authMiddleware } from '@/middlewares/authMiddleware';
import express, { Router } from 'express';

const router: Router = express.Router();

router.get(
  '/excel/hyphen-string-categories',
  authMiddleware,
  excelControllers.getAllCategoriesHyphenString
);

export default router;
