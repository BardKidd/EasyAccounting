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
  // 僅在 production 強制限流；dev/test 跳過，否則本地開發與 E2E/錄影反覆建立訪客會撞 5 次/小時上限。
  skip: () => process.env.NODE_ENV !== 'production',
  message: responseHelper(false, null, '請求過於頻繁，請稍後再試', null),
});

/**
 * Forgot Password Rate Limiter
 * 限制同一 IP 每分鐘最多 10 次忘記密碼請求
 */
export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: responseHelper(false, null, '請求過於頻繁，請稍後再試', null),
});
