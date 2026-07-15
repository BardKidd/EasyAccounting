import express, { Router } from 'express';
import { validate } from '@/middlewares/validate';
import { createUserSchema, changeBaseCurrencySchema, updateProfileSchema } from '@repo/shared';
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

// 個人檔案（self-scoped）：一律以 token 身分操作，禁止 :id。
// 必須註冊在 /user/:id 系列之前，避免被萬用參數路由攔截。
router.patch(
  '/user/profile',
  authMiddleware,
  validate(updateProfileSchema),
  userController.updateProfile,
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
