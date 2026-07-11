# Project Status & Roadmap: Personal Accounting App

## 📝 專案目標

建立一個功能完整的**個人記帳與資產管理**系統，整合 SQL (關聯資料) 與 NoSQL (非結構化資料) 架構，並實作完整的自動化通知、報表、預算與多幣別功能。

> 📌 本檔為高層 Roadmap。各功能的詳細技術規格見 `docs/specs/`，多幣別見 `docs/multicurrency-implementation-plan.md`。

---

## ✅ 已完成功能 (Current Status)

### 核心功能 (Core Features)

- [x] **使用者系統**: 註冊、登入 (JWT httpOnly cookie)、訪客登入、忘記/重設密碼、個人資料管理、密碼加密 (Bcrypt)、Refresh token 自動換發。
- [x] **帳戶管理**:
  - 支援多種帳戶類型 (現金、銀行、信用卡、證券戶、其他)。
  - 信用卡專屬欄位 (額度、結帳日、繳款日、未出帳金額)。
  - 帳戶封存 (isArchived)、on-budget 旗標。
- [x] **分類系統**:
  - 支援三階層分類模式 (RootCategory, MainCategory, SubCategory)。
  - 收入/支出分類管理、自訂分類、icon/color、軟刪除保留歷史。
- [x] **交易記錄**:
  - 收支記錄 CRUD。
  - 轉帳功能 (自動產生兩筆關聯交易)。
  - 自動更新帳戶餘額 (Wallet)。
  - 清單 / 行事曆 (Calendar) 雙視圖。
- [x] **信用卡進階管理 (Credit Card Management)**:
  - [x] **資料庫架構**: `CreditCardDetail` Table (結帳日、繳款日、額度)、`InstallmentPlan` Table (分期母計畫)。
  - [x] **帳單週期邏輯**: 支援 `billingDate` 自動歸屬帳單月份。
  - [x] **分期付款 (Installment)**: 建立分期交易 (自動展開 N 期)、餘額與額度計算 (總額佔用額度)。
  - [x] **繳款紀錄**: 使用轉帳 (Transfer) 邏輯實作，支援從銀行帳戶繳款。
  - [x] **回饋/紅利**: 信用卡回饋計算。
- [x] **交易功能增強 (Transaction Enhancements)**:
  - [x] **0 元交易**: 支援全額折抵或贈品紀錄 (Net Amount = 0, UI 顯示綠色)。
  - [x] **額外金額結構 (Transaction Extra)**: 資料表 `TransactionExtra` (手續費、折扣)、實際金額 (Net Amount) 計算公式、負數輸入自動轉正邏輯。
- [x] **週期性交易 (Recurring)**: `RecurringTemplate` 模型，支援 週/月/年 週期，cron 自動產生交易。
- [x] **對帳 (Reconciliation)**: 帳戶對帳流程、已對帳標記 (isReconciled / reconciliationDate)。

### 預算系統 (Budget System — YNAB 信封式)

> 📄 **技術規格**: [budget-ynab-spec.md](docs/specs/budget-ynab-spec.md)
> ⚠️ 舊版預算系統 (budget-system-spec) 已於 2026-06 拆除並改為 YNAB 重做。

- [x] **Phase 0+1**: 核心預算邏輯 (`budgetLogic.ts`)、service、月預算規劃與分配 UI、信封 (assignment) / 目標 (target) 模型。
- [x] **Phase 2** (2026-06-14): 信用卡付款預算化完整重做、目標管理、未來月份預先分配 (上界 `BUDGET_MAX_FUTURE_MONTHS = 12`)。
  - 本機全套測試綠 (backend / frontend)；部署需 release note。

### 多幣別支援 (Multi-currency)

> 📄 **技術規格**: [multicurrency-implementation-plan.md](docs/multicurrency-implementation-plan.md) (唯一真實來源，決策 D1–D9 已拍板)

- [x] **Phase 0–3** (2026-06-10): 幣別維度表、外幣帳戶、交易原幣/本位幣雙快照 (`amountInBase` / `baseRate`)、即時匯率抓取 (cron)、本位幣切換、跨幣淨值換算 (`getNetWorth`)。

### 統計與報表 (Statistics)

- [x] **儀表板總覽**: 淨資產、各帳戶餘額、近期收支趨勢。
- [x] **圖表分析**:
  - 收支趨勢折線圖、分類支出圓餅圖、月度收支統計。
  - 分頁分析: 明細 / 分類 / 排行 / 帳戶。
  - [x] **總資產趨勢圖 (Asset Trend Chart)**: 雙 Y 軸 (ECharts)，收支柱狀 + 總資產折線 (含 Zoom)。
  - [x] **總資產計算優化**: 倒推法 (Backward Calculation) 即時計算每月資產。

### 自動化與 AI (Automation & AI)

- [x] **Email 服務**: 整合 **Resend** 發送郵件。
- [x] **排程任務 (Cron Jobs)**: 每日記帳提醒 / 週摘要 / 月財務分析報告 / 匯率更新 / 訪客清理。
- [x] **PDF 帳單解析 (Bill Parse)**: Azure Service Bus 佇列 + Worker + Blob，LLM 解析帳單 → `PendingTransaction` → 確認入帳 (含 SSE 進度)。
- [x] **AI Chat**: 對話面板 + tools，知識庫 (MongoDB `knowledgeChunk`)。

### 系統功能

- [x] **系統公告**: 使用 **MongoDB (Mongoose)** 儲存公告資訊。
- [x] **軟刪除 (Soft Delete)**: 重要資料 (User, Transaction 等) 支援軟刪除與還原；afterDestroy hook 串接子資料清理。
- [x] **Excel 匯入/匯出**: 整合 Azure Blob Storage 與 ExcelJS，支援新增 / 編輯雙模式 (隱藏 id 欄分流)。

### 工程與運維 (Engineering & DevOps)

- [x] **測試策略**: Backend Vitest (Mock 隔離 DB)、Frontend Vitest (jsdom) + Playwright E2E。
- [x] **部署架構**: Frontend → Vercel；Backend → Railway。
- [x] **CI/CD**: Github Actions workflow。

---

## 🚧 開發中 / 待辦清單 (Roadmap)

> 以下依「拉開專業差距」的優先順序排列。Tier 1 為與專業記帳/資產管理工具差距最大的結構性缺口。

### 🔴 Tier 1 — 關鍵缺口 (定義「專業」與否)

> 定位就是單純的個人記帳軟體，**不做投資持倉 / 證券損益**（2026-07-09 使用者拍板移除）；證券戶維持單一 `balance` 數字即可。

#### 1. 拆分交易 + 標籤 (Split Transaction + Tags) — Priority High

> 專業記帳的兩個標配，目前皆無。`TransactionExtra` 只是加減項標籤，非真正 split。
> 📄 **技術規格**: [split-tags-spec.md](docs/specs/split-tags-spec.md) (設計定案；決策 S1–S9 已拍板；**Phase A Tags → Phase B Split** 順序固定)

- [x] **Phase A — 標籤系統 (Tags)** (2026-06-15)：真多對多 `tag`/`transaction_tag`，掛整筆交易；CRUD + 交易套用 + `?tagIds` 篩選 + 前端 chip/列表/篩選/管理頁。已 commit。
- [x] **Phase B — 拆分交易 (Split)** (2026-06-15)：`transaction_split` 子表 + `isSplit`；父層 `TransactionExtra` 與拆分並存、按比例攤提（DB view `transaction_split_unit` 為單一真實來源）；前端 `SplitEditor`（即時加總/配平）。本機測試綠 (backend 198 / frontend 49)；**部署需跑 migration**。
- [x] 統計與篩選支援 split / tag 維度（聚合走 view，對非拆分零行為變更）。

#### 2. 規則引擎 (Auto-categorization Rules) — Priority High

> `MerchantMapping` 目前只服務 PDF 解析、使用者不可見。應開放自訂規則讓匯入真正省力。
> 📄 **技術規格**: [rules-engine-spec.md](docs/specs/rules-engine-spec.md) (設計定案；決策 R1–R14 已拍板；**選項 B** 定案；**Phase A 修洩漏+自動學習 → Phase B 顯式規則** 順序固定)

- [ ] **Phase A — 修洩漏 + 自動學習 per-user + 管理 UI**：`merchant_mapping` 加 `userId`（修跨使用者 categoryId 洩漏 bug）+ 開放使用者看/改/刪/停用已學到的商家分類。
- [ ] **Phase B — 顯式規則**: 若 description 含 X 或金額符合 Y → 自動套分類 / 標籤；套用於 PDF 帳單解析、Excel 匯入、手動輸入。
- [ ] **Phase C（本輪不做）**: payee / 商家 (Merchant) 成為一級實體 (可管理)。

### 🟡 Tier 2 — 次要強化 (投報率高)

- [ ] **負債 / 貸款管理**: 一般貸款/房貸 (本金利息攤還表、剩餘本金)；淨值區分「資產 vs 負債」。
- [x] **交易搜尋 / 進階篩選** (2026-07-09): 關鍵字搜尋 (description ILIKE) + 金額區間 (minAmount/maxAmount)，疊加既有日期/帳戶/類型/標籤篩選；前端 filter bar 加搜尋框 (debounce) + 金額 popover。8 個真實 DB 整合測試綠。(payee 無此欄位故略；標籤篩選 Phase A 已做。)
- [~] **批次操作** (2026-07-10): 交易列表多選 (checkbox + 全選) + 工具列，批次**刪除** (重用 deleteTransaction 含轉帳沖銷/串接) 與批次**加標籤** (append 聯集，只套本人 tag)；`POST /transaction/batch`，回傳 {affected, skipped}。4 個真實 DB 整合測試綠。**批次改分類仍待辦**（需 budget/拆分/轉帳感知的完整更新路徑，另開一輪）。
- [ ] **預算 vs 實際報表**: 統計頁加「本月各分類 預算 vs 實支 達成率」視圖。
- [ ] **儲蓄 / 財務目標**: 跨帳戶目標追蹤 (例: 存 50 萬買車)，有別於 YNAB 信封目標。
- [ ] **匯入去重**: Excel / PDF 匯入重複偵測。
- [ ] **報表匯出 PDF**: 可下載的財務報表 (目前月報僅 email)。

### 🟢 Tier 3 — 加分 / 長期 (差異化)

- [ ] **家庭共享記帳**: 多使用者共用帳本 / 預算 (可由 `personnel_notification` 雛形延伸)。
- [ ] **台灣在地化**: 統一發票對獎、報稅可扣除支出標記 (tax category)。
- [ ] **現金流預測**: 依週期交易 + 預算預測未來餘額曲線、低餘額預警。
- [ ] **訂閱偵測**: 自動找出重複扣款的訂閱服務。
- [x] **稽核紀錄 / 變更歷史** (2026-06-17)：**全實體** CRUD 變更 log（交易/轉帳/帳戶/分類/標籤/預算）。**主目的為 NoSQL 水平擴展練習**——audit log 存獨立 MongoDB（shard key `{userId,createdAt}`），附本地 sharded cluster（Docker）+ seed 腳本供分片實驗。前端 `/audit-logs` 變更歷史檢視（6 類篩選 + 欄位級 diff）。測試 18 cases + 既有 165 unit/29 integration 全綠。📄 **規格**: [audit-log-sharding-spec.md](docs/specs/audit-log-sharding-spec.md)（決策 A1–A9）。本機未 commit；部署需 `AUDIT_MONGODB_URL`。
- [ ] **銀行同步**: Open Banking / Plaid 類自動匯入 (台灣難度高，長期)。

### 🔧 既有功能微調 (Backlog — 小項)

- [ ] **交易複製**: 快速複製歷史交易。
- [ ] **分期交易連動更新**: 更新某期分期金額時支援兩種模式：
  - **僅更新單筆**: 只修改該期金額 (現行行為)。
  - **連動後續期數**: 修改後自動將剩餘總額重新分配到後續未處理期數。
    > 範例：6000 分六期 (每期 1000)，前 3 期已完成，第 4 期改為 2000 → 剩餘 1000 平分至第 5、6 期 (各 500)。

---

## 🗄️ NoSQL 水平擴展候選分析 (Architecture Planning)

> 目標：未來在本地導入可水平擴展的 NoSQL，承接潛在高流量寫入 / 讀取。本節分析 Roadmap 中哪些功能適合下放至 NoSQL 分片叢集，哪些必須留在 PostgreSQL。

### 指導原則

- **金融帳本永遠留在 PostgreSQL**：交易、帳戶餘額、預算 assignment/target、對帳、持倉成本基礎與已實現損益等需要 **ACID 與強一致性**，不可分片到最終一致 (eventual consistency) 的節點——使用者餘額不容許讀到舊值。PG 自身可用 read replica / 按 userId 分區擴展讀，但帳本不下放 NoSQL。
- **高流量的來源不是單一使用者，而是「使用者數 × 背景寫入」的總量**。因此 NoSQL 候選的分片鍵 (shard key) 幾乎都是 `userId`（每使用者隔離、無跨片 join）或 `symbol`（行情共享）。
- NoSQL 只承接這類形狀的資料：**append-only / 寫多 / 廣播讀 / 時序 / 非結構化 / 可按上述鍵乾淨分片**。

### 候選清單（依優先序）

| 優先 | 候選資料 | 為何適合水平擴展 | 分片鍵 | 建議 NoSQL 型態 | 現況 |
|---|---|---|---|---|---|
| 🥈 中 | **匯率時序 (FX feed)** | 寫多、時序、幣別對多；若未來改抓 intraday 匯率則寫入量放大 | `currencyPair` + 時間桶 | 時序集合 (Mongo Time-Series / Influx / Timescale) | `exchangeRate` 現於 PG，日 cron 量小；改 intraday 才需遷出（已不含投資報價驅動） |
| 🥈 強 | **稽核 / 變更歷史 (audit log)** | append-only、永不更新、無上限成長、寫多、不需 join；shard-by-user 教科書案例 | `userId` | 寬列 / 文件 (Cassandra / Scylla / Mongo sharded) | Tier 3 待辦，未實作 |
| 🥈 強 | **行為事件流 (analytics events)** | 與 audit log 同形狀的高量 append；為「訂閱偵測 / 現金流預測」的事實來源 | `userId` + 時間 | 同上 / event store | 未實作（依附 Tier 3） |
| 🥉 強 | **AI Chat 對話歷史 + 向量檢索 (RAG)** | 對話訊息 append-only、可 shard-by-conversation；向量檢索讀多、可加 replica | `userId` / `conversationId` | 文件 + 向量索引 (已用 Mongo) | `knowledgeChunk` 已在 Mongo；對話歷史目前由前端帶入、未持久化 |
| ◎ 中 | **通知收件匣 / 推播 feed** | fan-out 寫、ephemeral、可用 TTL index 自動清 | `userId` | 文件 + TTL index | 現 `personnel_notification` 只是「偏好開關」，**尚無真正 inbox** |
| ◎ 中 | **預計算報表 / 儀表板快取** | 昂貴聚合算一次、讀多次 (月報、預算 vs 實際、淨值趨勢) | `userId` + 期間 | 文件 / KV (Mongo / Redis) | 目前即時計算 |
| ○ 讀放大 | **系統公告廣播讀** | 每使用者每頁讀同一小文件，讀多寫極少 | 全域（不分片） | 文件 + read replica / edge cache | 已在 Mongo（含 TTL index） |
| ○ 搜尋 | **交易全文搜尋索引** | 讀放大的二級索引；**非真實來源**，需隨 SQL 寫入 reindex（注意一致性落差） | `userId` | 搜尋引擎 (OpenSearch / Mongo Atlas Search) | Tier 2 待辦 |

### 必須留在 SQL（不可遷移）

交易帳本、帳戶餘額、預算 assignment/target、對帳狀態、投資持倉成本基礎與已實現損益——皆需強一致性與跨實體交易，留 PostgreSQL。

### 建議起手式

- **per-user 分片 + append-only 模型**已用 **audit log** 練成（見上，已實作）。下一步若要更高寫入量，可做 **行為事件流 (analytics events)**，形狀同 audit、直接餵「訂閱偵測 / 現金流預測」。
- **匯率時序**僅在改抓 intraday 匯率後才有遷出價值（現為日 cron 量小）；已無投資報價此一高量驅動。
