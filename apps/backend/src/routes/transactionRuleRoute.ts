import express, { Router } from 'express';
import { validate } from '@/middlewares/validate';
import {
  createTransactionRuleSchema,
  updateTransactionRuleSchema,
  reorderTransactionRulesSchema,
  transactionRuleIdParamSchema,
  listTransactionRulesQuerySchema,
} from '@repo/shared';
import transactionRuleController from '@/controllers/transactionRuleController';
import { authMiddleware } from '@/middlewares/authMiddleware';

const router: Router = express.Router();

router.get(
  '/rules',
  authMiddleware,
  validate(listTransactionRulesQuerySchema, 'query'),
  transactionRuleController.listRules,
);

router.post(
  '/rules',
  authMiddleware,
  validate(createTransactionRuleSchema),
  transactionRuleController.createRule,
);

// reorder 需在 /:id 之前，避免 'reorder' 被當成 id
router.put(
  '/rules/reorder',
  authMiddleware,
  validate(reorderTransactionRulesSchema),
  transactionRuleController.reorderRules,
);

router.put(
  '/rules/:id',
  authMiddleware,
  validate(transactionRuleIdParamSchema, 'params'),
  validate(updateTransactionRuleSchema),
  transactionRuleController.updateRule,
);

router.delete(
  '/rules/:id',
  authMiddleware,
  validate(transactionRuleIdParamSchema, 'params'),
  transactionRuleController.deleteRule,
);

export default router;
