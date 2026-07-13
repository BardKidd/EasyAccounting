# PWA 手機應用程式轉換計劃書 (iOS 優化)

> Status: APPROVED
> Created: 2026-07-12
> Last Updated: 2026-07-12

## Summary

本計劃書旨在將 EasyAccounting 系統升級為漸進式網頁應用程式 (PWA)，為行動裝置用戶（特別是 iOS 平台）提供如原生 App 般的體驗。我們將利用 Service Worker 快取**靜態資源**，配置 Web App Manifest 與 iOS 專屬 Meta 標籤及啟動畫面 (Splash Screens) 優化「加到主畫面」體驗。當無網路時，系統會顯示一個精美的「離線 fallback 頁面」提示需要網路連線；同時配合 iOS 16.4+ 支援的 Web Push API 提供推播通知。

**安全與運維前提（不可省）**：Service Worker 一旦註冊即具黏性，錯誤的 SW 會用陳舊快取「磚化」回訪用戶。本計劃只快取靜態資產，**絕不快取 `/api/*` 或任何已驗證的頁面文件**，並內建 SW 版本化與 kill-switch（見 §7）。

## Background & Motivation

EasyAccounting 目前是一個多專案的記帳與資產管理網頁應用程式。行動端記帳是使用者的核心場景。目前使用者在手機上瀏覽網頁有以下痛點：
1. **瀏覽器網址列與工具列干擾**：佔用有限的螢幕空間，且容易觸發瀏覽器滑動手勢。
2. **無網路或訊號不佳時直接崩潰或白屏**：使用者在收訊不良處，系統會直接顯示瀏覽器預設的斷網畫面，體驗不佳。我們需要提供一個有設計感的離線狀態提示頁面。
3. **缺乏 iOS 專屬優化**：缺少 Safe Area 瀏海排版優化、沒有 iOS 觸控回饋最佳化、啟動時無 Splash Screen。
4. **無法推播通知**：無法透過 App 系統推播提醒使用者記帳或警告預算超支。

### 現有前端架構（動工前必讀，避免與既有 layout 打架）

- `apps/frontend/src/app/(main)/LayoutContent.tsx` **已經**是 `flex fixed inset-0 overflow-hidden` 的 SPA 外殼，內層一個 `overflow-y-auto` 捲動 div（含 `pb-24 md:pb-32`）。**外層彈簧回彈其實已被壓住**，本計劃只需在內層捲動容器補 `overscroll-behavior`，切勿再對全域 `html, body` 下 `position: fixed`（會連帶弄壞 `(auth)` 群組的登入/註冊長表單捲動）。
- 導覽是 **`Sidebar`（滑入抽屜，`md:relative`）+ `Header`**，**沒有** Bottom Navigation Bar。因此 Safe Area 避讓的實際目標是 **Header 頂部**、**Sidebar 抽屜**與**內層捲動容器底部**，而非不存在的底部導覽列。
- 版本：Next.js `16.2.10` + React `19.2.0`。淺/深色由 `ThemeProvider`（`enableSystem`, `defaultTheme="dark"`，但使用者可切 light）。**主題會切換這件事，決定了狀態列與 theme_color 的設計（見 §1）。**

---

## Requirements

### Functional Requirements (功能需求)

- [ ] **FR-1: 「加到主畫面」支援 (Add to Home Screen)**
  - 提供獨立的 Manifest 設定，讓使用者可在 Safari 中點選「分享」並「加到主畫面」。
  - 啟動後以全螢幕 (standalone) 模式執行，隱藏 Safari 網址列與底部導覽列。
- [ ] **FR-2: iOS 啟動畫面 (Splash Screen)**
  - 以工具（`pwa-asset-generator`）批次產生各主要 iOS 裝置解析度的啟動畫面，避免啟動時出現白畫面。
- [ ] **FR-3: 離線提示頁面 (Offline Fallback Page)**
  - 當 Service Worker 偵測到使用者斷網且無法獲取頁面資源時，回傳預先快取的 `/offline` 提示頁面。
  - `/offline` 頁面需具備精美設計，提示使用者「目前處於離線狀態，本系統需要網路連線才能進行記帳與管理」，並提供「重新整理/重試」按鈕。
  - `/offline` 必須 `force-static` 且**不依賴任何 API / Provider 資料**（見 §4）。
- [ ] **FR-4: iOS 專屬安裝引導彈窗 (iOS Install Prompt)**
  - 由於 iOS Safari 不支援標準的 `beforeinstallprompt` 事件，系統需主動偵測「是否在 iOS/iPadOS 裝置」且「是否尚未安裝 PWA」，若是，則彈出引導視窗，教導使用者如何點選「分享」→「加到主畫面」。
- [ ] **FR-5: Web Push 推播通知 (iOS 16.4+)**
  - 使用者將 PWA 加到主畫面後，能訂閱記帳提醒與預算通知。
  - 串接 VAPID 與 Web Push API，當後端 cron-job 觸發時，發送通知至 iOS 裝置。

### Non-Functional Requirements (非功能需求)

- [ ] **NFR-1: iOS Safe Area 滿版相容性**
  - 支援瀏海屏 (Notch)、動態島 (Dynamic Island) 以及底部 Home Indicator 手勢條的避讓。
  - **前置條件**：`viewport-fit=cover` 必須由 viewport meta 提供（Next.js `viewport` export），否則 `env(safe-area-inset-*)` 全回 `0px`，本需求整組失效（見 §3）。
- [ ] **NFR-2: 順暢的行動端互動**
  - 停用雙擊縮放（`touch-action: manipulation`）。
  - 移除按鈕與互動項目的預設 iOS 灰底點擊高亮（`-webkit-tap-highlight-color: transparent`）。
  - 於既有內層捲動容器加 `overscroll-behavior-y: contain`，防止 Safari 過捲彈簧與誤觸下拉更新；**不對全域 html/body 動 `position: fixed`**。
- [ ] **NFR-3: 快取效能（可量測）**
  - 以 Lighthouse（行動模擬，參考機 iPhone 14 等級）量測**回訪（SW 已暖）**時的表現：靜態殼載入的 LCP 相對首訪有可見改善，且不因 SW 造成部署後白屏（見 §7 更新策略）。
  - 移除原「1.5 秒」絕對值 — 無基準機、無量測法、首訪本就無 SW，該數字不可驗收。

---

## Technical Design

### 1. Web App Manifest & iOS Meta Tags（含主題切換處理）

在 `apps/frontend/public/` 中建立 `manifest.json`，並在 Next.js 根 `layout.tsx` 中配置 `metadata` 與 `viewport`。

**Web App Manifest (`apps/frontend/public/manifest.json`):**
```json
{
  "name": "EasyAccounting 簡單記帳",
  "short_name": "EasyAccounting",
  "description": "現代化的個人記帳與資產管理應用程式",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#09090b",
  "theme_color": "#09090b",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512x512-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```
> 註 1：`maskable` 與 `any` 應為**不同圖檔**（maskable 需含 safe-zone 邊距），別在同一檔混用 `"purpose": "any maskable"`。
> 註 2：manifest 的 `theme_color`/`background_color` 是**靜態單值**，無法跟隨淺/深色切換；此處固定深色（符合 `defaultTheme="dark"`），淺色使用者首訪 splash 會有一次深色閃屏，屬已知取捨。位址列顏色改由 §下方 `viewport.themeColor` 的 media 成對值控制（iOS Safari 採用 `<meta name="theme-color">`）。
> 註 3：`orientation` 已移除 — iOS Safari 對 home-screen PWA 大致無視 manifest 方向鎖，別依賴。

**Next.js `metadata` 與 `viewport` (`apps/frontend/src/app/layout.tsx`):**
```tsx
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "EasyAccounting",
  description: "專業個人記帳應用程式",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    // 預設用 "default"：狀態列不透明、內容置於其下，避免 black-translucent
    // 在淺色主題造成「白字白底」看不見的問題。
    statusBarStyle: "default",
    title: "EasyAccounting",
  },
};

export const viewport: Viewport = {
  viewportFit: "cover", // ← Safe Area 的必要開關，放這裡而不是 CSS @viewport
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};
```
> **狀態列取捨**：若日後要真正的沉浸式（內容延伸到瀏海下），才改用 `statusBarStyle: "black-translucent"`；但那會強制白色狀態列字，必須確保狀態列後方**任何主題下**都是夠深的背景，否則淺色模式時鐘/電量隱形。權衡後本期先用 `default`。

### 2. iOS 啟動畫面 (Splash Screens)

iOS Safari 需針對不同螢幕尺寸提供 `<link rel="apple-touch-startup-image" ...>`，**未精確匹配的裝置會退回白啟動畫面**。因此：
- 用 `pwa-asset-generator` 批次產生所有主要 iOS 裝置（含 2x/3x、SE/mini、iPad、直向）的 splash 與對應 media query，**別手刻表**（手刻幾乎必漏機型）。
- 這些是 `<link>` 標籤，需以自訂 component 注入 `layout.tsx` 的 `<head>`（Next Metadata API 無 startup-image 一級支援）。
> 更正：`generateViewport` 控制的是 **viewport meta**，與 startup image 無關，勿用它注入啟動圖。

下表僅為**節選示意**（實際以產生器輸出為準）：

| iOS 設備規格 (示意) | 解析度 (px) | media query |
|-----------------------|-------------|-------------|
| iPhone 15 Pro Max, 14 Pro Max | 1290x2796 | `(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)` |
| iPhone 15 Pro, 15, 14 Pro | 1179x2556 | `(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)` |
| iPhone 14 Plus, 13 Pro Max | 1284x2778 | `(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)` |
| iPhone 14, 13 Pro, 13, 12 Pro | 1170x2532 | `(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)` |

### 3. Safe Area Styling (CSS & Layout)

**關鍵修正**：`viewport-fit=cover` 已在 §1 由 `viewport` export 提供，**不要**再寫 `@viewport { ... }`（該 CSS at-rule 已被瀏覽器移除，寫了也無效，且會讓 `env(safe-area-inset-*)` 回 `0px`）。

**全域配置 (`apps/frontend/src/app/globals.css`) — 只做變數與觸控，不碰全域捲動：**
```css
:root {
  --safe-area-top: env(safe-area-inset-top, 0px);
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
}

/* 觸控優化（NFR-2） */
* {
  -webkit-tap-highlight-color: transparent;
}
html {
  touch-action: manipulation;
}
```

**防彈簧回彈 — 加在既有內層捲動容器，而非全域 html/body：**
`(main)/LayoutContent.tsx` 外層已是 `fixed inset-0 overflow-hidden`，只需在其 `overflow-y-auto` 的內層捲動 div 補：
```css
overscroll-behavior-y: contain;
-webkit-overflow-scrolling: touch;
```
> 切勿對全域 `html, body` 下 `position: fixed; overflow: hidden`：會重複既有外殼、且洩漏到 `(auth)` 群組使註冊等長表單無法捲動；原稿引用的 `#pwa-scroll-container` 在 codebase 並不存在。

**Safe Area 避讓的實際套用點（無 Bottom Nav）：**
- **Header**（`@/components/layout` 的 `Header`）：`padding-top: calc(1rem + var(--safe-area-top))`
- **內層捲動容器底部**：既有 `pb-24 md:pb-32` 改為 `calc(6rem + var(--safe-area-bottom))`（或於底部浮動元素加 `var(--safe-area-bottom)`）
- **Sidebar 抽屜**：頂/底各補對應 inset，避免抽屜內容被瀏海與 Home Indicator 蓋住

### 4. Service Worker & 離線提示頁面設計

**SW 工具選型（先拍板再實作）**：Next 16.2.10 + React 19 下，建議採 **`@serwist/next`**（Workbox 系、`next-pwa` 的維護後繼；`@ducanh2912/next-pwa` 落後於 Next 16）；或全手寫 SW 求完全掌控。決策見 §7 與 Open Questions。

- **離線 Fallback 機制**：
  1. `/offline` 必須是**自足靜態頁**：在 `apps/frontend/src/app/offline/page.tsx` 設 `export const dynamic = 'force-static'`，且**不呼叫 API、不依賴 SWRProvider/Auth**。
  2. SW 於 `install` 階段預快取 `/offline` 的 **HTML、其 RSC payload 及所需 JS chunks**（否則 App Router client 導覽會抓 `?_rsc=` 而非純 HTML，缺快取就報錯而非顯示離線頁）。
  3. `fetch` 階段：僅攔截**導覽請求（`request.mode === 'navigate'`）**，失敗時回傳快取的 `/offline`。**API 請求（`/api/*`）一律 network-only，不進快取。**

**離線 Fallback 頁面 (`apps/frontend/src/app/offline/page.tsx`):**
* 不依賴 API 連線的靜態 UI（`force-static`）。
* 包含：
  * 精美行動端插圖（Lucide-React `WifiOff` 為核心；動畫優先用 CSS keyframes，避免為離線頁多快取 Framer Motion chunk）。
  * 標題：「偵測不到網路連線」。
  * 內容說明：「本應用程式需要網路連線以確保您的帳務資料即時同步至雲端。請檢查您的 Wi-Fi 或行動數據，並點選下方重試按鈕。」
  * 重試按鈕：點選後執行 `window.location.reload()`。

### 5. iOS 安裝引導 (iOS Install Prompt)

由於 iOS Safari 不會發送 `beforeinstallprompt`，需在用戶端偵測並手動呈現引導 UI。

**偵測邏輯（修正 iPadOS 漏偵測）：**
```typescript
const isIOS = () => {
  const ua = navigator.userAgent;
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ 預設回報桌面 "Macintosh" UA，需用 maxTouchPoints 補抓 iPad
  const iPadOS = navigator.maxTouchPoints > 1 && /Macintosh/.test(ua);
  return (iOSDevice || iPadOS) && !(window as any).MSStream;
};

const isStandalone = () => {
  return (window.navigator as any).standalone === true
    || window.matchMedia('(display-mode: standalone)').matches;
};

// 若 isIOS() && !isStandalone()，則顯示安裝引導 Modal
```

**引導 UI 設計**：
- 位於畫面底部的抽屜式彈窗 (BottomSheet) 或對話框（Shadcn UI）。
- 示意圖展示點擊 Safari 底部工具列 **「分享」(Share Icon)** → 下滑選 **「加入主畫面」(Add to Home Screen)**。
- 儲存「使用者已關閉提示」於 `localStorage`（24 小時內不再顯示），避免重複打擾。

### 6. Web Push Notifications (iOS 16.4+)

在 iOS 16.4+，Web PWA **僅在已加到主畫面（standalone）時**可用 Push API。

**前端流程：**
1. 檢查 `('serviceWorker' in navigator) && ('PushManager' in window)`。
2. 僅當 `isStandalone()` 為真才顯示「開啟記帳推播提醒」開關（非 standalone 時顯示灰態並提示需先加到主畫面）。
3. **在使用者點擊開關（user gesture）中**呼叫 `Notification.requestPermission()`（iOS 要求手勢觸發，非手勢會被拒）。
4. 權限獲准後，以 `NEXT_PUBLIC_VAPID_PUBLIC_KEY`（base64url → `Uint8Array` 作 `applicationServerKey`）取得 `PushSubscription`。
5. 將 Subscription 傳送到後端 `POST /api/notifications/subscribe` 儲存並綁定用戶帳號。

**後端流程（雙 DB 架構、user 隔離、cascade）：**
- 訂閱存於 **PostgreSQL（`accounting` schema）**，新增 Sequelize 模型 `PushSubscription`：
  - 欄位：`id`、**`userId`（FK，必帶）**、`endpoint`（unique）、`p256dh`、`auth`、時間戳。
  - 於 `src/models/` 定義 runtime 模型，並於 `database/migrations/` 新增對應 migration（兩處都要，見 CLAUDE.md「migration 與 runtime 模型分離」）。
  - **接入 `src/models/index.ts` 的 `afterDestroy` soft-delete cascade**：刪 User 連帶刪其 subscriptions（帶 `individualHooks: true`），比照 user-scoped 表紀律，避免跨使用者資料殘留。
- 使用 `web-push` 套件；VAPID 私鑰置於後端 `.env`，公鑰以 `NEXT_PUBLIC_VAPID_PUBLIC_KEY` 給前端。
- 在每日記帳提醒 cron-job 執行時，查詢 active subscriptions 發送 payload。
- **失效訂閱清理**：`web-push` 送出若回 `410 Gone` / `404`，代表訂閱已失效，**當場從 DB 刪除該筆**（否則表持續累積死訂閱、白送）。

---

## Edge Cases & Error Handling

1. **斷網重試按鈕**：用戶點重試若網路仍未恢復，給視覺提示（loading 轉圈或 Toast「仍處於離線狀態」），避免點擊無反應。
2. **通知憑證過期（前端）**：iOS 的 Push Subscription 可能因 Safari 系統重置失效；每次開 App（standalone）時在背景重新取得 `PushSubscription` 並上報後端更新。
3. **通知憑證過期（後端）**：見 §6，送出回 410/404 即刪。
4. **登出 / 共用裝置的快取清理**：登出時清除 SW caches 與 `PushSubscription`（呼叫 `registration.pushManager` 取消訂閱並通知後端刪除），避免下一位使用者在同裝置看到殘留快取或收到他人推播。
5. **部署後陳舊 SW**：見 §7 更新與 kill-switch，避免新版資產與舊 precache 不一致造成白屏。

---

## 7. Service Worker 更新策略與 Kill-Switch（運維風險，必做）

SW 具黏性，是本計劃最大的運維風險。必須：
- **版本化 precache**：每次部署以內容 hash 作 cache 名稱，`activate` 時清除舊版 cache。
- **更新流程**：採 `skipWaiting()` + `clients.claim()`，並在前端偵測到新 SW 時提示使用者重整（或自動於下次導覽套用），避免使用者停在舊殼。
- **只快取靜態資產**：precache 侷限 `/_next/static/*`、圖標、`/offline` 及其依賴；**永不快取 `/api/*` 或已驗證的頁面文件**（配合 httpOnly cookie auth 與 `proxy.ts` 守衛，避免把已驗證殼供給登出者、或跨使用者快取洩漏）。
- **Kill-switch**：保留一支可快速部署的「反註冊」SW（`self.registration.unregister()` + 清 caches），一旦線上出現 SW 造成的白屏可立即止血。

---

## Out of Scope (非本次範圍)

- **離線狀態下記帳與資料寫入**：本次先不考慮離線新增帳目與同步機制。
- **其他瀏覽器（如 Chrome for iOS）的安裝提示**：本次優先專注 Safari 的標準引導。
- **新增 Bottom Navigation Bar**：現有導覽為 Sidebar + Header，本計劃不新增底部導覽列；Safe Area 僅套用於既有元件。

---

## Open Questions

1. **SW 工具選型：`@serwist/next` vs 手寫 SW**
   - 現狀：Next.js `16.2.10` + React `19.2.0`。`@ducanh2912/next-pwa` / `next-pwa` 在 Next 16 / React 19 可能不相容或落後維護。
   - 建議：優先評估 **`@serwist/next`**（Workbox 系、活躍維護）；若對快取/更新流程要求完全掌控，則手寫最小 SW + entry script。需在 Task 3.2 前定案。
2. **狀態列樣式**：本期用 `statusBarStyle: "default"`（避免淺色模式白字隱形）。是否有沉浸式（black-translucent）的強需求？若有，需先確認狀態列後方於任何主題下皆為深色。
3. **測試環境的 HTTPS 前提**：SW / 安裝 / Push 需 secure context。目前 dev 為 LAN http（`192.168.64.3`），iOS 實機無法測 SW/Push；需走 **Vercel Preview** 或 localhost tunnel。實機驗收前需先備妥 HTTPS 環境。
