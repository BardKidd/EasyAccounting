import express from 'express';
import { handleChat } from '@/controllers/chatController';
import { authMiddleware } from '@/middlewares/authMiddleware';

const router = express.Router();

router.post('/chat', authMiddleware, handleChat);

export default router;
