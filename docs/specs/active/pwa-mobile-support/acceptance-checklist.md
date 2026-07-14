# PWA 手機 — 實機 / HTTPS 驗收清單（Task 6）

> Spec: [spec.md](./spec.md) · Tasks: [tasks.md](./tasks.md)
> 為何需要人工：SW / 安裝 / Push 需 **secure context（HTTPS）+ iOS 實機**。本機 dev 為 LAN http，`env(safe-area-inset-*)`、Push、standalone 偵測都無法真實重現。
>
> **驗收前置**：
> 1. 部署到 **Vercel Preview**（HTTPS）。
> 2. 前端環境變數 `NEXT_PUBLIC_VAPID_PUBLIC_KEY` 已設（見 spec §6 / 下方 Push 前置）。
> 3. 後端環境變數 `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` 已設，且 migration `20260714000000-create-push-subscription` 已 `pnpm db:migrate:up`。
> 4. 測試裝置：至少一台 **iOS 16.4+ 的 iPhone**（Push 需 16.4+）＋一台 Android/桌面 Chrome（對照 SW / offline）。

勾選規則：每項標 ✅ 通過 / ❌ 失敗（附裝置 + 現象）/ ⏭️ 不適用。

---

## 6.1 iOS 安裝與 Safe Area（實機 Safari）

- [ ] Safari 開 Preview URL → 分享選單出現「加入主畫面」；加入後主畫面出現正確**圖標**（非白底截圖）。
- [ ] 首次啟動顯示對應機型 **Splash Screen**（無長時間白畫面）。找一台非旗艦機型（如 SE / mini）確認未退回白啟動圖。
- [ ] 啟動後為 **standalone 全螢幕**（無 Safari 網址列 / 底部工具列）。
- [ ] **瀏海 / 動態島**：Header 頂部內容未被瀏海遮住（`--safe-area-top` 生效）。
- [ ] **Home Indicator**：底部 `BottomTabBar` 與內容未被手勢條蓋住；FAB 可完整點擊（`pb-[env(safe-area-inset-bottom)]` 生效）。
- [ ] **狀態列可讀性**：淺色與深色主題各切一次，狀態列時鐘 / 電量在任何主題都清楚可見（`statusBarStyle: default`）。
- [ ] iPad（若有）：加入主畫面偵測正常（iPadOS 回報 Macintosh UA，靠 `maxTouchPoints` 補抓）。

## 6.1b iOS 安裝引導彈窗

- [ ] iOS Safari **非 standalone** 時，出現「分享 → 加入主畫面」引導彈窗。
- [ ] 點「稍後再說」→ 24 小時內同裝置不再彈出（`localStorage` 標記）。
- [ ] 已安裝（standalone）啟動時**不**再顯示引導。
- [ ] 桌面 / Android Chrome **不**顯示 iOS 引導。

## 6.2 離線 Fallback（Chrome DevTools + iOS 實機）

- [ ] 桌面 Chrome：Application → Service Workers 確認 SW 已註冊、`activated`。
- [ ] DevTools **Offline** 勾選後，導覽到任一頁 → 顯示 `/offline` 頁（WifiOff + 「偵測不到網路連線」），非瀏覽器預設斷網頁。
- [ ] `/offline` 的「重新整理」按鈕：仍離線時給視覺回饋（不無反應）；恢復網路後點擊可正常回到 App。
- [ ] Network 面板確認：`/api/*` 請求**從不**命中 SW cache（離線時 API 直接失敗，非回舊資料）。
- [ ] iOS 實機開飛航模式重現離線頁。

## 6.3 SW 更新策略與 Kill-Switch

- [ ] 模擬新部署（`SW_VERSION` 由 `v2` bump 到 `v3` 或內容 hash 改變）→ 回訪**無白屏**；新 SW `activate` 後舊版 cache 被清除（Application → Cache Storage 只剩當前版本）。
- [ ] 前端偵測到新 SW → 提示重整（或下次導覽自動套用），使用者不會卡在舊殼。
- [ ] **Kill-switch 演練**：部署 `sw-kill.js`（`unregister()` + 清 caches）路徑可反註冊，線上白屏能即時止血。

## 6.4 Web Push 全鏈路（iOS 16.4+ standalone）

> Push 在 iOS **僅 standalone（已加到主畫面）** 可用。務必從主畫面圖標啟動，而非 Safari 分頁。

- [ ] 設定頁「推播通知」開關：**非 standalone** 時為灰態並提示「需先加到主畫面」。
- [ ] standalone 下點開關（user gesture）→ 跳出系統權限請求 → 允許。
- [ ] 允許後：後端 `push_subscription` 表出現該使用者一筆（`userId` / `endpoint` / `p256dh` / `auth`）。
- [ ] 觸發每日提醒 cron（或手動呼叫 `checkDailyReminder`）→ iOS 收到推播通知（標題「記帳提醒」）。
- [ ] 點通知 → 開啟 / 聚焦 App 並導向 `/transactions?new=1`。
- [ ] **失效清理**：解除訂閱 / 移除主畫面後再觸發發送 → 後端收到 410/404 → 對應 `push_subscription` 列被刪除（不再累積死列）。
- [ ] **登出清理**：登出後 `pushManager` 取消訂閱、後端該列刪除、SW caches 清空；同裝置換帳號登入不會收到前一位使用者的推播。
- [ ] 多裝置：同一使用者兩台裝置各訂閱 → 兩台都收到（`push_subscription` 兩列）。

## Push 前置（部署設定，非驗收步驟）

VAPID 金鑰已產生（見交付說明），設定方式：

- 後端 `.env`（**私鑰勿進版控 / 勿給前端**）：
  ```
  VAPID_PUBLIC_KEY=<public>
  VAPID_PRIVATE_KEY=<private>
  VAPID_SUBJECT=mailto:you@example.com
  ```
- 前端 `.env`（僅公鑰）：
  ```
  NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public>
  ```
- 未設金鑰時後端 `webPushService.isConfigured()` 為 false，發送靜默略過（不報錯）；前端開關應對「後端未啟用」給合理灰態。

---

## Phase 2–4 行動端功能頁抽驗（每頁 @390px）

搬移後每個功能頁在窄螢幕（≤ md）應：**無橫向捲動**、金額與情境同屏、列動作用 `⋯` 底部 sheet（非 hover）、彈窗改底部 sheet、觸控目標 ≥44px；桌面（≥ md）維持原樣。

- [ ] 帳戶 accounts · [ ] 帳單匯入 bill-import · [ ] 對帳 reconciliation（列表 + 明細）
- [ ] 預算 budget · [ ] 統計 statistics（圖表不溢出）· [ ] 設定 settings
- [ ] 定期 recurring · [ ] 規則 rules · [ ] 商家對應 merchant-mappings · [ ] 變更歷史 audit-logs
- [ ] 底部導覽：3 tab + 中央 FAB（短按新增交易、長按拍照/匯入）+ 更多 sheet 全頁可達。
