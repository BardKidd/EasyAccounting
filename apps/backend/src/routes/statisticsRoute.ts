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

router.post(
  '/statistics/detail',
  authMiddleware,
  validate(getOverviewSchema),
  statisticsController.getDetailTabData
);

router.post(
  '/statistics/category',
  authMiddleware,
  validate(getOverviewSchema),
  statisticsController.getCategoryTabData
);

router.post(
  '/statistics/ranking',
  authMiddleware,
  validate(getOverviewSchema),
  statisticsController.getRankingTabData
);

router.post(
  '/statistics/account',
  authMiddleware,
  validate(getOverviewSchema),
  statisticsController.getAccountTabData
);

router.post(
  '/statistics/asset-trend',
  authMiddleware,
  statisticsController.getAssetTrend
);

export default router;
