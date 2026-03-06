# Guest Login (訪客登入)

> Status: APPROVED
> Created: 2026-03-04
> Last Updated: 2026-03-04

## Summary

允許使用者不需完整註冊或登入即可體驗系統功能。系統會在後端建立一個帶有 `isGuest` 標記的真實帳號，使得訪客可以無縫體驗所有功能。訪客日後可以隨時透過註冊將此帳號「轉正」，永久保留試用期間的紀錄。

## Background & Motivation

降低新使用者的試用門檻。讓潛在用戶能在決定註冊帳號前，更直接且無痛地體驗應用程式的核心記帳功能，同時在技術架構上保持對現有 API 和前端邏輯的最小衝擊。

## Requirements

### Functional Requirements

- [ ] FR-1: 訪客點擊「試用」按鈕後，後端自動生成並登入一組具有 `isGuest: true` 標籤的免洗帳號 (e.g., `guest_<uuid>@easyaccounting.demo`)。建立時 `name` 帶入 "Guest"，`password` 設為一組隨機強密碼。**防止使用這些生成的信箱/密碼透過一般登入介面進行登入。**
- [ ] FR-2: 訪客登入狀態會永久保持登入 (同一般 User Session)，除非使用者主動點擊登出或 Session 遭清除。
- [ ] FR-3: 登入/註冊頁面的防呆轉導：當前端啟動或進入 Login/Register 頁面時，若透過 `/api/me` 或既有的 Auth API 確認擁有未過期之有效 Token，系統會自動轉導回 Dashboard 內。
- [ ] FR-4: 在 Dashboard/Profile 提供明顯的「註冊/保存資料」入口，訪客點定後需填寫與一般註冊相同的欄位 (**姓名、Email、密碼、確認密碼**)，完成後直接將當前的 Guest 帳號轉為正式帳號 (資料完全保留)。
- [ ] FR-5: 訪客若在 Profile 點擊「登出」，必須彈出**強烈警告**（如「登出後將無法找回目前的帳目，是否確認？」），並要求使用者二次確認 (例如輸入特定文字如 "DELETE") 才能執行登出。
- [ ] FR-6: 針對訪客模式，不提供「登入現有帳號並合併」的操作按鈕。訪客若想登入其現有帳號，必須先點擊「登出」(執行 FR-5 並放棄目前訪客資料)，回到首頁或是 Login 頁面後才能進行正常登入。

### Non-Functional Requirements

- [ ] NFR-1: 系統需要有排程任務 (Cron Job)，定期清理由於未註冊而廢棄的訪客帳號。定義為「超過 30 天未活躍且 `isGuest=true`」的帳號將被自動刪除，並以 Cascade 模式連帶刪除底下所有關連資料 (帳本, 交易, 預算, 分期, 週期性交易)。
- [ ] NFR-2: 訪客帳號的建立與操作，不應對現有的核心商業邏輯 (如建立帳本、新增交易) 造成改動。
- [ ] NFR-3: **限流機制 (Rate Limiting)**：針對 POST `/api/auth/guest-login` 加入 IP 限制 (如 1小時內最多 5 次)，避免惡意腳本大量建立垃圾帳號。
- [ ] NFR-4: **併發與一致性 (Concurrency Control)**：Guest 轉正的 API 必須實作 Database Transaction，確保 `Email Uniqueness` 檢查與 `UPDATE` 動作的原子性 (Atomicity)，防止 Race Condition 撞號。

## Technical Design

### Data Model

1. **`users` Table**:
   - 加入 `isGuest` (boolean, default: `false`) 欄位。
   - 加入 `lastActivityAt` (timestamp) 欄位。

### API / Backend Changes

1. **Middleware / Interceptor (`lastActivityAt`)**:
   - 實作機制以更新 `lastActivityAt`：在 Authenticated Request Middleware 成功認證後，**非同步地 (Fire-and-forget) 觸發更新該 User 的 `lastActivityAt = NOW()`**。若效能考量，可使用 Redis / 快取實作 Rate-limited updates (例如每 5 分鐘最多寫入 DB 一次)。
2. **`POST /api/auth/login` (Modify)**
   - 加入防呆：若撈出的 User 資料其 `isGuest === true`，直接 Reject (回傳如 403 Forbidden)，禁止透過一般登入形式登入 Guest 帳號。
3. **`POST /api/auth/guest-login` (New)**:
   - 加入 IP Rate Limiting。
   - 建立並回傳一組隨機生成的 User，`isGuest` = `true`, `name` = "Guest", `password` = `RandomHash`。
   - 簽發 Access Token 與 Refresh Token (Payload 內需包含 `isGuest: true`)。
4. **`POST /api/auth/promote` 或修改 `register` (Modify)**:
   - 開啟 DB Transaction，使用 `SELECT FOR UPDATE` 確保原子性。
   - 驗證使用者輸入的新 Email 未被使用。
   - 執行 `UPDATE (name, email, password, isGuest=false)`。
   - **Token Refresh**: 更新成功後，重新簽發一組使用「新 Email 與新 isGuest 狀態」的 Access / Refresh Token 給前端。
5. **Cron Job (Delete Stale Guests)**:
   - 尋找 `lastActivityAt < NOW() - 30 days` 且 `isGuest === true` 的使用者。
   - 徹底刪除 User (需確保關聯底下的 Schema如 transactions, books 等均設定為 `ON DELETE CASCADE`，或要在程式端實作清楚所有 Foreign Key 資料)。

### Frontend Changes

1. **JWT Auth Management & Auth Guard**:
   - 前端目前的 Auth Manager 需能從 JWT 解析或透過 `/api/me` 確保存有 `isGuest` 狀態。
   - Auth Guard 進入登入/註冊前會檢查 Session，若有效則自動重導向回 Dashboard。
2. **登入頁 (Login/Register)**:
   - 增加「訪客試用」按鈕，打 `POST /api/auth/guest-login`。
3. **導覽列 / Profile (Layout)**:
   - 根據 `isGuest` 狀態，在 Avatar 的選單列表內顯示 CTA：「註冊以永久保存資料」。
   - 若為 Guest 身份，Avatar 旁的名稱顯示應經過處理 (例如只秀訪客圖示或固定文字，避免顯示醜陋的 UUID email)。
   - 客製化「登出」按鈕流程，增加 Modal 詢問「登出後資料將遺失」，並要求 Double Check。

## Edge Cases & Error Handling

- **訪客轉正時撞名 (Email already exists)**: 在轉正 Transaction 中，如檢查到註冊 Email 已被使用，向前端拋出 409 Conflict 錯誤。前端提示「此 Email 已被使用，請更換 Email，或選擇登入此帳號 (目前的試用資料將被清空)」。

## Out of Scope

- 不支援將「目前訪客產生的資料」合併進入「一個已經存在的舊帳號」內。

## Open Questions

- 目前沒有待釐清的開放問題。
