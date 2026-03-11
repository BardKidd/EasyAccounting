import rateLimit from 'express-rate-limit';
import { responseHelper } from '@/utils/common';

/**
 * Guest Login Rate Limiter
 * 限制同一 IP 每小時最多 5 次訪客登入請求
 */
export const guestLoginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: responseHelper(false, null, '請求過於頻繁，請稍後再試', null),
});
