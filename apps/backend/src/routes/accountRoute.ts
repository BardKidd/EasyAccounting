import express, { Router } from 'express';
import { validate } from '../middlewares/validate';
import { createAccountSchema, updateAccountSchema } from '@repo/shared';
import accountController from '../controllers/accountController';

const router: Router = express.Router();

router.post(
  '/account',
  validate(createAccountSchema),
  accountController.addAccount
);
router.get('/account/:userId', accountController.getAccountsByUser);
router.put(
  '/account/:accountId',
  validate(updateAccountSchema),
  accountController.editAccount
);
router.delete('/account/:accountId', accountController.deleteAccount);

export default router;
