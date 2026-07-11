import express, { Router } from 'express';
import authController from '@/controllers/authController';
import { validate } from '@/middlewares/validate';
import { authMiddleware } from '@/middlewares/authMiddleware';
import {
  guestLoginLimiter,
  forgotPasswordLimiter,
  loginLimiter,
  resetPasswordLimiter,
} from '@/middlewares/rateLimiter';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@repo/shared';

const router: Router = express.Router();

router.post('/login', loginLimiter, validate(loginSchema), authController.login);

router.post('/logout', authController.logout);

router.post('/guest-login', guestLoginLimiter, authController.guestLogin);

router.post(
  '/promote',
  authMiddleware,
  validate(registerSchema),
  authController.promote,
);

router.get('/me', authMiddleware, authController.me);

router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);

router.post(
  '/reset-password',
  resetPasswordLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword,
);

export default router;
