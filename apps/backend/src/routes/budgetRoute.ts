import express, { Router } from 'express';
import { validate } from '@/middlewares/validate';
import {
  initBudgetSchema,
  budgetSettingsSchema,
  assignSchema,
  moveMoneySchema,
  monthParamSchema,
  monthCategoryParamsSchema,
  monthCreditParamsSchema,
  categoryParamSchema,
  upsertTargetSchema,
  autoAssignSchema,
} from '@repo/shared';
import budgetController from '@/controllers/budgetController';
import { authMiddleware } from '@/middlewares/authMiddleware';

const router: Router = express.Router();

// 預算狀態
router.get('/budget', authMiddleware, budgetController.getStatus);

// 啟用預算
router.post(
  '/budget/init',
  authMiddleware,
  validate(initBudgetSchema),
  budgetController.init,
);

// 更新設定
router.put(
  '/budget/settings',
  authMiddleware,
  validate(budgetSettingsSchema),
  budgetController.updateSettings,
);

// 月份視圖
router.get(
  '/budget/months/:month',
  authMiddleware,
  validate(monthParamSchema, 'params'),
  budgetController.getMonthView,
);

// 分配 assigned
router.put(
  '/budget/months/:month/assignments/:categoryId',
  authMiddleware,
  validate(monthCategoryParamsSchema, 'params'),
  validate(assignSchema),
  budgetController.assignBudget,
);

// 搬錢
router.post(
  '/budget/months/:month/move',
  authMiddleware,
  validate(monthParamSchema, 'params'),
  validate(moveMoneySchema),
  budgetController.moveMoney,
);

// CC Payment 信封分配（Phase 2 ④）
router.put(
  '/budget/months/:month/cc-assignments/:accountId',
  authMiddleware,
  validate(monthCreditParamsSchema, 'params'),
  validate(assignSchema),
  budgetController.assignCreditPayment,
);

// 設定/更新信封 target（Phase 2 ③）
router.put(
  '/budget/categories/:categoryId/target',
  authMiddleware,
  validate(categoryParamSchema, 'params'),
  validate(upsertTargetSchema),
  budgetController.upsertTarget,
);

// 刪除信封 target
router.delete(
  '/budget/categories/:categoryId/target',
  authMiddleware,
  validate(categoryParamSchema, 'params'),
  budgetController.deleteTarget,
);

// Auto-Assign（補足 underfunded / 沿用上月）
router.post(
  '/budget/months/:month/auto-assign',
  authMiddleware,
  validate(monthParamSchema, 'params'),
  validate(autoAssignSchema),
  budgetController.autoAssign,
);

export default router;
