import express, { Router } from 'express';
import { validate } from '@/middlewares/validate';
import { createUserSchema, changeBaseCurrencySchema } from '@repo/shared';
import userController from '@/controllers/userController';
import { authMiddleware } from '@/middlewares/authMiddleware';

const router: Router = express.Router();

router.post('/user', validate(createUserSchema), userController.addUser);

// 切換本位幣（多幣別）
router.patch(
  '/user/base-currency',
  authMiddleware,
  validate(changeBaseCurrencySchema),
  userController.changeBaseCurrency,
);

router.get('/user/:id', authMiddleware, userController.getUser);
router.put(
  '/user/:id',
  authMiddleware,
  validate(createUserSchema),
  userController.editUser
);
router.delete('/user/:id', authMiddleware, userController.deleteUser);

export default router;
