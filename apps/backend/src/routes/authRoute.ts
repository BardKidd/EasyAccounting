import express, { Router } from 'express';
import authController from '@/controllers/authController';
import { validate } from '@/middlewares/validate';
import { loginSchema } from '@repo/shared';

const router: Router = express.Router();

router.post('/login', validate(loginSchema), authController.login);

router.post('/logout', authController.logout);

export default router;
