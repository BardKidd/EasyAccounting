import express, { Router } from 'express';
import authController from '@/controllers/authController';
import { validate } from '@/middlewares/validate';
import { authMiddleware } from '@/middlewares/authMiddleware';
import { guestLoginLimiter } from '@/middlewares/rateLimiter';
import { loginSchema, registerSchema } from '@repo/shared';

const router: Router = express.Router();

router.post('/login', validate(loginSchema), authController.login);

router.post('/logout', authController.logout);

router.post('/guest-login', guestLoginLimiter, authController.guestLogin);

router.post(
  '/promote',
  authMiddleware,
  validate(registerSchema),
  authController.promote,
);

router.get('/me', authMiddleware, authController.me);

export default router;
