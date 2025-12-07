import express, { Router } from 'express';
import { validate } from '@/middlewares/validate';
import { createUserSchema } from '@repo/shared';
import userController from '@/controllers/userController';
import { authMiddleware } from '@/middlewares/authMiddleware';

const router: Router = express.Router();

router.post(
  '/user',
  authMiddleware,
  validate(createUserSchema),
  userController.addUser
);
router.get('/user', authMiddleware, userController.getUsers);
router.get('/user/:id', authMiddleware, userController.getUser);
router.put(
  '/user/:id',
  authMiddleware,
  validate(createUserSchema),
  userController.editUser
);
router.delete('/user/:id', authMiddleware, userController.deleteUser);

export default router;
