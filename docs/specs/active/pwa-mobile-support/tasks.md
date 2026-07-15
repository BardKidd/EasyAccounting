# PWA 手機應用程式轉換 — 實作任務清單

> Spec: [spec.md](./spec.md)
> Status: IN PROGRESS — 前端 PWA 殼（Task 1–4）已實作並通過 typecheck / lint / build + /offline 實測；
> Web Push（Task 5）與實機驗收（Task 6）待後續（需 VAPID 私鑰 + HTTPS + iOS 實機）。

## Tasks

### 0. 前置決策（動工前，阻擋後續）

- [x] **0.1 SW 工具選型定案** — 拍板：**手寫最小 SW**（`public/sw.js` + `public/sw-kill.js`）。理由：Next 16.2.10 相容零風險、完全掌控 §7 版本化 / navigate-only / api network-only / kill-switch，無新建置外掛依賴。
  - 評估 `@serwist/next`（建議）vs 手寫 SW；於 Next 16.2.10 + React 19 實測可註冊、可更新（見 spec §4 / §7 / Open Questions）
- [ ] **0.2 備妥 HTTPS 測試環境**
  - 確認 Vercel Preview（或 localhost tunnel）可用；LAN http（`192.168.64.3`）無法測 SW/Push（見 spec Open Questions 3）

### 1. PWA 基礎設定與 iOS Meta

- [x] **1.1 產生 PWA 圖標與 Splash Screens**
  - 產生 192x192、512x512（`any`）與 512x512 maskable（含 safe-zone，**獨立檔**）圖標，放 `public/icons/`
  - 產生 Apple Touch Icon (180x180) 放 `public/apple-touch-icon.png`
  - 用 `pwa-asset-generator` 批次產生各主要 iOS 裝置（2x/3x、SE/mini、iPad、直向）Splash 與 media query，放 `public/splash/`（勿手刻表）
- [x] **1.2 建立 Web App Manifest**
  - 建立 `apps/frontend/public/manifest.json`（`display: standalone`、`theme_color`/`background_color` 固定深色、maskable 用獨立檔、不設 `orientation`）
- [x] **1.3 設定 Next.js 根 layout 的 metadata / viewport**
  - `metadata.appleWebApp: { capable: true, statusBarStyle: "default", title }`、`metadata.manifest`
  - **`export const viewport: Viewport = { viewportFit: "cover", themeColor: [light/dark media 成對] }`**（`viewport-fit=cover` 必放這裡，非 CSS `@viewport`）
  - 以自訂 component 注入 `<link rel="apple-touch-startup-image">`（Metadata API 無一級支援；勿用 `generateViewport`）

### 2. CSS 與行動端 UI/UX 優化 (iOS 避讓與手勢)

- [x] **2.1 實作 Safe Area Padding（對既有元件，無 Bottom Nav）**
  - `globals.css` 宣告 `--safe-area-top/bottom` 變數（**不寫 `@viewport`**）
  - `Header` 補 `padding-top: calc(1rem + var(--safe-area-top))`
  - `(main)/LayoutContent.tsx` 內層捲動容器底部 `pb-24` 改為含 `var(--safe-area-bottom)`
  - `Sidebar` 抽屜補頂/底 inset
- [x] **2.2 改善觸控體驗與彈簧效果（不碰全域 html/body）**
  - `-webkit-tap-highlight-color: transparent`、`touch-action: manipulation`
  - 於**既有內層捲動容器**加 `overscroll-behavior-y: contain` + `-webkit-overflow-scrolling: touch`
  - **不**對全域 `html, body` 下 `position: fixed`（會弄壞 `(auth)` 長表單；外殼已 `fixed inset-0`）

### 3. Service Worker 與離線 Fallback 提示頁面

- [x] **3.1 實作 `/offline` Fallback 頁面（force-static）**
  - 建立 `apps/frontend/src/app/offline/page.tsx`，`export const dynamic = 'force-static'`，**不依賴 API / SWRProvider / Auth**
  - 設計「偵測不到網路連線」UI（`WifiOff` + CSS 動畫 + 「重新整理」重試按鈕）
- [x] **3.2 整合 Service Worker（依 0.1 選型）**
  - 於 `install` 預快取 `/offline` 的 **HTML + RSC payload + 依賴 JS chunks** 及 `/_next/static/*`、圖標
  - `fetch` 僅攔截 `request.mode === 'navigate'` 失敗 → 回 `/offline`
  - **`/api/*` 一律 network-only，永不快取**（見 spec §4 / §7）
- [x] **3.3 SW 更新策略與 Kill-Switch（運維，必做）**
  - precache 以內容 hash 版本化，`activate` 清舊 cache；`skipWaiting` + `clients.claim` + 新版提示重整
  - 準備一支「反註冊」kill-switch SW（`unregister()` + 清 caches）以備線上止血

### 4. iOS 專屬安裝提示元件

- [x] **4.1 實作偵測邏輯與 Hook**
  - `usePWAInstall` hook：偵測 iOS **含 iPadOS（`maxTouchPoints > 1 && /Macintosh/`）**、非 standalone、檢查 `localStorage` 略過標記
- [x] **4.2 實作引導 Modal/BottomSheet**
  - Shadcn UI 底部引導彈窗，標「分享」→「加入主畫面」步驟
  - 「稍後再說」→ `localStorage` 24 小時內不再顯示

### 5. Web Push 推播通知

- [x] **5.1 後端 PushSubscription 模型 + migration（userId、cascade）** — 2026-07-14
  - `src/models/PushSubscription.ts`（`userId` FK CASCADE、`endpoint` unique、`p256dh`、`auth`、hard-delete）
  - `database/migrations/20260714000000-create-push-subscription.js`（accounting schema、endpoint unique + userId index）
  - `src/models/index.ts`：import + `User.afterDestroy` 串接 `PushSubscription.destroy({ where: { userId } })` + association + export
- [x] **5.2 後端 Web Push 與 VAPID（程式部分）** — 2026-07-14
  - 已安裝 `web-push` + `@types/web-push`；VAPID keypair 已產生（私鑰交付使用者設 `.env`，**未進版控**）
  - `@repo/shared` 新增 `pushSubscription.schema.ts`（`pushSubscriptionSchema` / `pushUnsubscribeSchema`）+ index 匯出
  - `services/webPushService.ts`（VAPID init、`sendPushToUser`、410/404 清理）、`services/pushSubscriptionServices.ts`（upsert / remove / has）
  - `controllers/notificationController.ts` + `routes/notificationRoute.ts`：`POST /api/notifications/subscribe`、`/unsubscribe`、`GET /status`（皆 `authMiddleware` + `validate`）；掛載於 `app.ts`
  - ⏳ **待使用者**：後端 `.env` 設 `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT`；前端 `.env` 設 `NEXT_PUBLIC_VAPID_PUBLIC_KEY`；跑 `pnpm db:migrate:up`
- [ ] **5.3 前端 Push 訂閱開關與權限取得** — ⏳ 等 migration workflow 跑完（避免撞 settings 頁）
  - 個人設定頁「推播通知」開關；**非 standalone 顯示灰態並提示需先加到主畫面**
  - 於**點擊手勢中**請求 `Notification.requestPermission()`；以 `NEXT_PUBLIC_VAPID_PUBLIC_KEY` 取 `PushSubscription` 上報 `POST /api/notifications/subscribe`
- [x] **5.4 整合 Cron Job 推播 + 失效清理** — 2026-07-14
  - `cron/notificationCron.ts` `checkDailyReminder` 對訂閱使用者呼叫 `webPushService.sendPushToUser`（標題「記帳提醒」、導向 `/transactions?new=1`）
  - 送出回 `410`/`404` → `webPushService` 當場刪除該筆（單元測試 `tests/unit/webPushService.test.ts` 3 passed）
  - SW 端 `public/sw.js` 新增 `push` + `notificationclick` handler，`SW_VERSION` bump `v1`→`v2`
- [ ] **5.5 登出 / 共用裝置清理** — ⏳ 前端部分等 workflow（後端 `/unsubscribe` 已備）
  - 登出時清 SW caches、取消 `pushManager` 訂閱並呼叫 `POST /api/notifications/unsubscribe`（見 spec Edge Cases 4）

### 6. 測試與驗證

> **人工驗收清單見 [acceptance-checklist.md](./acceptance-checklist.md)**（需 Vercel Preview HTTPS + iOS 16.4+ 實機）。

- [ ] **6.1 行動端實機測試（需 HTTPS，見 0.2）**
  - 於 Vercel Preview + iOS 實機 Safari 測「加入主畫面」、Safe Area 避讓、狀態列可讀性（淺/深色）
- [ ] **6.2 離線 Fallback 測試**
  - Chrome DevTools 斷網，確認導覽失敗導向 `/offline` 且重試按鈕正常；確認 `/api/*` 不被快取
- [ ] **6.3 SW 更新 / Kill-Switch 測試**
  - 模擬新部署（換 hash）確認無白屏、可更新；驗證 kill-switch 能反註冊止血
- [ ] **6.4 Push 全鏈路測試**
  - standalone 下訂閱 → cron 發送 → iOS 收到；驗證 410/404 清理與登出清理
