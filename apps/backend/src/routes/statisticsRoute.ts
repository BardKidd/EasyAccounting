import { authMiddleware } from '@/middlewares/authMiddleware';
import { validate } from '@/middlewares/validate';
import statisticsController from '@/controllers/statisticsController';
import express, { Router } from 'express';
import { getOverviewSchema } from '@repo/shared';

const router: Router = express.Router();

router.post(
  '/statistics/overview/trend',
  authMiddleware,
  validate(getOverviewSchema),
  statisticsController.getOverviewTrend
);

router.post(
  '/statistics/overview/top3Categories',
  authMiddleware,
  validate(getOverviewSchema),
  statisticsController.getOverviewTop3Categories
);

router.post(
  '/statistics/overview/top3Expenses',
  authMiddleware,
  validate(getOverviewSchema),
  statisticsController.getOverviewTop3Expenses
);

export default router;
