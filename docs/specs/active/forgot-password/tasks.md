# Forgot Password — Implementation Tasks

> Spec: [spec.md](./spec.md)
> Status: IN PROGRESS

## Tasks

### 1. Data Layer

- [x] 1.1 新增 `PasswordResetToken` model (`apps/backend/src/models/PasswordResetToken.ts`)
- [x] 1.2 新增 DB migration：建立 `password_reset_tokens` table (含 `token` index)
- [x] 1.3 在 `models/index.ts` 註冊 model 關聯 (User hasMany PasswordResetToken)

### 2. Shared Package

- [x] 2.1 新增 `forgotPasswordSchema` 和 `resetPasswordSchema` 至 `packages/shared/src/schemas/auth.schema.ts`
- [x] 2.2 匯出新增的 schema types

### 3. Backend — Infra

- [x] 3.1 在 `app.ts` 設定 `trust proxy`，確保取得真實 Client IP
- [x] 3.2 新增 `forgotPasswordLimiter` 至 `rateLimiter.ts`（per-IP 限制）

### 4. Backend — Email

- [x] 4.1 新增 `passwordReset.tsx` email template (`apps/backend/src/emails/`)
- [x] 4.2 新增 `sendPasswordResetEmail` 至 `emailService.ts`

### 5. Backend — Controller & Routes

- [x] 5.1 新增 IP geolocation helper（使用 `ipinfo.io` HTTPS API）
- [x] 5.2 新增 `forgotPassword` controller method（SHA-256 token + per-email 限制）
- [x] 5.3 新增 `resetPassword` controller method（SHA-256 驗證 + O(1) 查詢 + 標記 usedAt）
- [x] 5.4 新增 routes (`authRoute.ts`)

### 6. Frontend

- [x] 6.1 新增 `authService` methods：`forgotPassword()` 和 `resetPassword()`
- [x] 6.2 新增 `/forgot-password` page（支援深淺色主題）
- [x] 6.3 新增 `/reset-password` page（支援深淺色主題）

### 7. Testing

- [ ] 7.1 手動測試完整流程
- [ ] 7.2 驗證安全性（token 過期、token 重複使用、email 列舉防護、rate limit）
