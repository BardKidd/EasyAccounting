import express, { Router } from 'express';
import currencyController from '@/controllers/currencyController';
import { authMiddleware } from '@/middlewares/authMiddleware';

const router: Router = express.Router();

router.get('/currencies', authMiddleware, currencyController.getCurrencies);
router.get(
  '/exchange-rate',
  authMiddleware,
  currencyController.getSuggestedRate,
);

export default router;
