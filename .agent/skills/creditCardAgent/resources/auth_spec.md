# Authentication & Token Rotation Specification

## 1. 路由存取控制 (Access Control)

- **機制**: 透過 Express Middleware (`authMiddleware`) 統一攔截。
- **涵蓋範圍**: 所有受保護的 API 路由 (e.g., `/api/transactions`, `/api/user`).

## 2. Token 策略 (Dual Token Strategy)

- **Access Token**:
  - **用途**: 存取 API 的唯一憑證。
  - **效期**: 短 (e.g., 15分鐘)。
  - **Cookie 行為**: `Max-Age` 需設定為長效期 (e.g., 跟隨 Refresh Token 或 session)，**不應**隨 JWT 過期而自動消失，以利後端判斷「過期」狀態而非「未登入」狀態。
- **Refresh Token**:
  - **用途**: **僅用於換發新的 Access Token**，不可直接用於存取一般 API。
  - **效期**: 長 (e.g., 7天)。
  - **Cookie 行為**: `httpOnly`，隨效期自動失效。

## 3. 無感刷新流程 (Silent Refresh via Middleware)

### 核心原則

當 Access Token 過期時，它**仍然存在於 Cookie 中**。Middleware 偵測到「已過期」狀態後，檢查 Refresh Token 進行換發。

### 流程詳解

當使用者發出 API 請求：

1.  **驗證 Access Token**:
    - Middleware 讀取 `accessToken` Cookie。
    - **若有效**：
      - Pass (`next()`).
    - **若已過期 (Expired)**：
      - 進入刷新流程。
    - **若無效/不存在 (Invalid/Missing)**：
      - 視為未登入 -> 嘗試檢查 Refresh Token (容錯) 或直接 401。

2.  **刷新流程 (Refresh Logic)**:
    - 檢查 `refreshToken` Cookie。
    - **Case A: 無 Refresh Token 或 無效**:
      - 代表登入期限已過。
      - **清除所有 Cookies** (Access + Refresh)。
      - 回傳 `401 Unauthorized`。
    - **Case B: Refresh Token 有效**:
      - 驗證通過。
      - 簽發 **新的 Access Token**。
      - **覆蓋舊 Cookie**: 設定 `Set-Cookie: accessToken=newAccessToken` (取代原本過期的那顆)。
      - **放行**: 讓原本的 Request 使用新身分繼續執行。

### 優點

- **前端零負擔**: 前端只需像平常一樣呼叫 API，無需關心 Token 是否過期。
- **原子性**: 刷新與請求在同一條連線中完成，不會有 Race Condition (如多個請求並發導致多次刷新) 的問題，因為都在後端序列處理 (或是可接受的重複簽發)。
- **符合需求**: 使用者完全無感，且確實在 API 執行前完成了換證。

## 4. API Endpoints

### POST /api/login

- **Response**:
  - 設定 `accessToken` 與 `refreshToken` Cookies。
  - Body 不需要回傳 `expiresIn`。

### POST /api/logout

- **Action**: 清除所有 Cookies。
