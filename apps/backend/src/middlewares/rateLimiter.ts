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
  // 安全修復 #32：僅在 test 跳過，staging/dev 也需受限流保護（原本 !== 'production' 會讓非正式環境全裸奔）。
  skip: () => process.env.NODE_ENV === 'test',
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
  // 安全修復 #32：僅在 test 跳過（避免遮蔽 controller 內各環境皆生效的 per-email 閘門），
  // staging/dev 也需受 per-IP 限流保護。比照 guestLoginLimiter。
  skip: () => process.env.NODE_ENV === 'test',
  message: responseHelper(false, null, '請求過於頻繁，請稍後再試', null),
});

/**
 * Login Rate Limiter
 * 安全修復 #13：限制同一 IP 每 15 分鐘最多 10 次登入請求，抵禦帳密暴力破解 / 撞庫
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  // 僅在 test 跳過，staging/dev 亦需受 per-IP 限流保護。比照 guestLoginLimiter。
  skip: () => process.env.NODE_ENV === 'test',
  message: responseHelper(false, null, '請求過於頻繁，請稍後再試', null),
});

/**
 * Reset Password Rate Limiter
 * 安全修復 #31：限制同一 IP 每 15 分鐘最多 5 次重設密碼請求，抵禦 token 猜測 / 暴力嘗試
 */
export const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  // 僅在 test 跳過，staging/dev 亦需受 per-IP 限流保護。比照 guestLoginLimiter。
  skip: () => process.env.NODE_ENV === 'test',
  message: responseHelper(false, null, '請求過於頻繁，請稍後再試', null),
});
