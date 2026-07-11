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
 * 限制同一 IP 每分鐘最多 3 次忘記密碼請求（NFR-4 per-IP 閘門）
 */
export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  // 僅在 production 強制 per-IP 限流；dev/test 跳過，否則本地與整合測試反覆打此端點會撞上限，
  // 遮蔽 controller 內的 per-email 閘門（per-email 為應用層邏輯，各環境皆生效）。比照 guestLoginLimiter。
  skip: () => process.env.NODE_ENV !== 'production',
  message: responseHelper(false, null, '請求過於頻繁，請稍後再試', null),
});
