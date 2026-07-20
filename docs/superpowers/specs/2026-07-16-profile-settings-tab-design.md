# 個人檔案 Tab 與設定入口 — Design Spec

日期：2026-07-16
狀態：已與使用者確認方向（方案 A：個人檔案併入 `/settings` 新 tab）

## 背景

Header 頭像 dropdown 內「個人檔案」與「設定」兩個 `DropdownMenuItem`（`apps/frontend/src/components/layout/header.tsx:195,198`）目前是純擺飾，無任何行為。`/settings` 已是完整設定 hub（分類管理、通知設定、貨幣設定、標籤管理四個 tab）。本設計讓兩顆按鈕生效，並新增「個人檔案」tab。

Guest 使用者在 dropdown 看不到這兩顆按鈕（另有「註冊以永久保存資料」CTA），故個人檔案 tab 的服務對象為正式帳號。

## 資安原則（本次開發硬性要求）

**所有新增 API 一律以 JWT token 內的 `userId` 識別身分，禁止從 URL path 或 request body 接收 userId。**

背景：舊路由（`GET/PUT/DELETE /user/:id`）曾有 IDOR 風險，後端已修復為忽略 `:id`、一律用 token 身分（`userServices.getUserFromDB`），但路由形狀仍殘留 `:id`。本次新端點全部採 self-scoped 路徑（`/user/profile`、`/user/password`、`/user/me`），不再有 `:id` 出現。前端也不得在任何請求中攜帶 userId。

## 變更內容

### 1. Header 入口（`apps/frontend/src/components/layout/header.tsx`）

- 「設定」→ `Link` 到 `/settings`
- 「個人檔案」→ `Link` 到 `/settings?tab=profile`
- 以 `DropdownMenuItem asChild` 包 `next/link`，維持既有樣式 class。

### 2. Settings 頁 tab 深連結（`apps/frontend/src/app/(main)/settings/page.tsx`)

- Server component 改讀 `searchParams.tab`。
- 白名單驗證：`profile | categories | notifications | currency | tags`；無效值或未帶參數 → fallback `categories`（維持現行預設）。
- 新增第 5 個 tab「個人檔案」（value=`profile`），排最後。TabsList 手機版為 `grid-cols-2`，5 個項目會有一格落單，可接受。

### 3. 新元件 `apps/frontend/src/components/settings/profileSettings.tsx`

三個卡片區塊（沿用既有 settings 元件的卡片/表單風格，RHF + zod resolver 接 `@repo/shared`）：

1. **帳號資料**
   - `name` 可編輯，儲存呼叫 `PATCH /api/user/profile`。
   - `email` 唯讀顯示（v1 不支援改 email，見「範圍外」）。
   - 資料來源：既有 `GET /api/auth/me`。
2. **變更密碼**
   - 欄位：目前密碼、新密碼、確認新密碼。
   - 成功後：toast「密碼已更新，請重新登入」→ 導向 `/login`。原因：後端 bump `tokenVersion`，所有裝置舊 session 立即作廢（與 reset-password 行為一致）。
   - 失敗（舊密碼錯）：表單層顯示「目前密碼不正確」。
3. **危險區 — 刪除帳號**
   - 紅色卡片 + confirm dialog，需輸入「刪除」二字才啟用確認鈕。
   - 呼叫 `DELETE /api/user/me`。後端 soft-delete，既有 `afterDestroy` cascade hooks（`src/models/index.ts`）連帶清理 Transaction/Account/Budget 等，務必 `individualHooks` 生效路徑（單一 instance `destroy()` 本身即觸發 hook）。
   - 成功後：呼叫 logout 清 cookie → 導向 `/login`。

### 4. Shared schemas（`packages/shared/src/schemas/user.schema.ts`，先改這裡）

```ts
export const updateProfileSchema = z.object({
  name: z.string().min(1, '使用者名稱為必填'),
});

// 後端驗證用（不含 confirm）
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '請輸入目前密碼'),
  newPassword: z.string().min(8, '密碼至少需要 8 個字元'),
});

// 前端表單用：加 confirmNewPassword + refine 一致性
export const changePasswordFormSchema = changePasswordSchema
  .extend({ confirmNewPassword: z.string() })
  .refine((d) => d.newPassword === d.confirmNewPassword, {
    message: '兩次輸入的密碼不一致',
    path: ['confirmNewPassword'],
  });
```

### 5. 後端新 endpoints（`userRoute.ts` / `userController.ts`）

| Method | Path | Middleware | 行為 |
|---|---|---|---|
| PATCH | `/api/user/profile` | `authMiddleware` + `validate(updateProfileSchema)` | 只更新 `name`，身分取自 token |
| PATCH | `/api/user/password` | `authMiddleware` + `validate(changePasswordSchema)` | `bcrypt.compare` 驗目前密碼，錯 → 400「目前密碼不正確」；對 → hash(12) 新密碼、`tokenVersion + 1` |
| DELETE | `/api/user/me` | `authMiddleware` | soft-delete 自己（token 身分），觸發 cascade hooks，並以 `clearAuthCookie` 清除 auth cookies |

注意：

- 路由註冊順序：`/user/profile`、`/user/password`、`/user/me` 必須註冊在 `/user/:id` **之前**，避免被 `:id` 萬用路徑攔截。
- 舊 `PUT /user/:id`（`editUser`）已知問題：未帶 `password` 會 `bcrypt.hash(undefined)` 拋錯、不驗舊密碼、不 bump `tokenVersion`。前端無人使用。**不在本次範圍**，僅記錄於此；後續可另開清理票（含 `GET/DELETE /user/:id` 收斂為 self-scoped）。

### 6. 前端 service（`apps/frontend/src/services/`）

- `updateProfile(data)` → `PATCH /user/profile`
- `changePassword(data)` → `PATCH /user/password`
- `deleteAccount()` → `DELETE /user/me`
- 全部走既有 `apiHandler`；改名成功後更新 `localStorage('user')` 並發出 `user-updated` 事件，header（讀 localStorage）監聽該事件即時更新顯示名稱。

## 測試計畫

後端（vitest，`apps/backend`，DB 相關不可平行）：

- `PATCH /user/profile`：改名成功；未帶 name → 400；未登入 → 401。
- `PATCH /user/password`：舊密碼錯 → 400；成功後 `tokenVersion` +1；成功後新密碼可登入、舊密碼不可。
- `DELETE /user/me`：soft-delete 成功；使用者關聯資料（至少 Transaction）連帶 soft-delete；未登入 → 401。
- 資安：三個新端點皆不受 request 中夾帶他人 userId 影響（body 帶 `userId` 欄位應被忽略）。

前端（vitest jsdom）：

- `profileSettings` 表單驗證：空名稱、密碼不一致、新密碼過短。
- settings 頁 tab 白名單：`?tab=profile` 顯示個人檔案、無效值 fallback `categories`。

## 範圍外

- 改 email（需寄驗證信流程）
- Guest 直接以 URL 訪問 `/settings` 的行為調整
- `editUser`（`PUT /user/:id`）修復或移除、舊 `:id` 路由收斂
- 主題切換移入設定頁
