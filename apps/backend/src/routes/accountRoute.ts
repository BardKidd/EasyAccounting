import express, { Router } from 'express';
import { validate } from '@/middlewares/validate';
import { createAccountSchema, updateAccountSchema } from '@repo/shared';
import accountController from '@/controllers/accountController';
import { authMiddleware } from '@/middlewares/authMiddleware';

const router: Router = express.Router();

router.post(
  '/account',
  authMiddleware,
  validate(createAccountSchema),
  accountController.addAccount,
);
router.get(
  '/personnel-accounts',
  authMiddleware,
  accountController.getAccountsByUser,
);
router.put(
  '/account/:accountId',
  authMiddleware,
  validate(updateAccountSchema),
  accountController.editAccount,
);
router.delete(
  '/account/:accountId',
  authMiddleware,
  accountController.deleteAccount,
);
router.patch(
  '/account/:accountId/archive',
  authMiddleware,
  accountController.archiveAccount,
);
router.patch(
  '/account/:accountId/unarchive',
  authMiddleware,
  accountController.unarchiveAccount,
);

export default router;
