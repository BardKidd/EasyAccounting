import express, { Router } from 'express';
import { validate } from '@/middlewares/validate';
import {
  createRecurringTemplateSchema,
  updateRecurringTemplateFutureSchema,
  cancelRecurringTemplateSchema,
} from '@repo/shared';
import recurringTemplateController from '@/controllers/recurringTemplateController';
import { authMiddleware } from '@/middlewares/authMiddleware';

const router: Router = express.Router();

// 取得使用者所有週期性交易規則（ACTIVE / ARCHIVED）
router.get(
  '/recurring-templates',
  authMiddleware,
  recurringTemplateController.getTemplates,
);

// 建立週期性交易規則
router.post(
  '/recurring-templates',
  authMiddleware,
  validate(createRecurringTemplateSchema),
  recurringTemplateController.createTemplate,
);

// B. 修改整個週期（此筆 + 未來）
router.put(
  '/recurring-templates/:id/future',
  authMiddleware,
  validate(updateRecurringTemplateFutureSchema),
  recurringTemplateController.updateTemplateFuture,
);

// B. 刪除整個週期（取消 template + 刪除此筆）
router.patch(
  '/recurring-templates/:id/cancel',
  authMiddleware,
  validate(cancelRecurringTemplateSchema),
  recurringTemplateController.cancelTemplate,
);

// 使用者主動暫停
router.patch(
  '/recurring-templates/:id/archive',
  authMiddleware,
  recurringTemplateController.archiveTemplate,
);

// 恢復暫停中的規則
router.patch(
  '/recurring-templates/:id/resume',
  authMiddleware,
  recurringTemplateController.resumeTemplate,
);

export default router;
