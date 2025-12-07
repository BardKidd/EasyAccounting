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
  accountController.addAccount
);
router.get(
  '/personnel-accounts',
  authMiddleware,
  accountController.getAccountsByUser
);
router.put(
  '/account/:accountId',
  authMiddleware,
  validate(updateAccountSchema),
  accountController.editAccount
);
router.delete(
  '/account/:accountId',
  authMiddleware,
  accountController.deleteAccount
);

export default router;
