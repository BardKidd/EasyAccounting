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

#### 1. 投資持倉追蹤 (Investment Holdings) — Priority Highest

> 產品定位是「資產管理」，但目前證券戶只有單一 `balance` 數字，無持倉概念。這是與專業工具差距最大的破口。

- [ ] **Holdings 模型**: 標的 (股票/ETF/基金/加密貨幣) × 股數 × 成本基礎 × 現價。
- [ ] **市值與未實現損益**: 現價 × 股數 − 成本。
- [ ] **已實現損益**: 賣出時計算 (FIFO / 移動平均)。
- [ ] **股利 / 配息記錄**。
- [ ] **價格來源**: 手動輸入 → (後續) 接 API (台股證交所 / Yahoo Finance)。
- [ ] **淨值整合**: `getNetWorth` 即時納入投資市值 (目前只 SUM 帳戶 balance)。
- [ ] 啟用既有但未使用的 `Currency.isCrypto` 旗標。

#### 2. 拆分交易 + 標籤 (Split Transaction + Tags) — Priority High

> 專業記帳的兩個標配，目前皆無。`TransactionExtra` 只是加減項標籤，非真正 split。

- [ ] **拆分交易**: 一筆交易拆成多個分類 (例: 全聯 1200 → 食材 800 + 日用品 400)。
- [ ] **標籤系統 (Tags)**: 跨分類橫向標記 (例: 「日本旅遊 2026」橫跨交通/飲食/購物)。
- [ ] 統計與篩選支援 split / tag 維度。

#### 3. 規則引擎 (Auto-categorization Rules) — Priority High

> `MerchantMapping` 目前只服務 PDF 解析、使用者不可見。應開放自訂規則讓匯入真正省力。

- [ ] **使用者自訂規則**: 若 payee 含 X 或金額符合 Y → 自動套分類 / 標籤。
- [ ] 套用於 PDF 帳單解析、Excel 匯入、手動輸入。
- [ ] payee / 商家 (Merchant) 成為一級實體 (可管理)。

### 🟡 Tier 2 — 次要強化 (投報率高)

- [ ] **負債 / 貸款管理**: 一般貸款/房貸 (本金利息攤還表、剩餘本金)；淨值區分「資產 vs 負債」。
- [ ] **交易搜尋 / 進階篩選**: 全文搜尋、金額區間、標籤、payee 篩選 (目前僅日期 + 帳戶/分類/type)。
- [ ] **批次操作**: 批次改分類 / 刪除 / 標記。
- [ ] **預算 vs 實際報表**: 統計頁加「本月各分類 預算 vs 實支 達成率」視圖。
- [ ] **儲蓄 / 財務目標**: 跨帳戶目標追蹤 (例: 存 50 萬買車)，有別於 YNAB 信封目標。
- [ ] **匯入去重**: Excel / PDF 匯入重複偵測。
- [ ] **報表匯出 PDF**: 可下載的財務報表 (目前月報僅 email)。

### 🟢 Tier 3 — 加分 / 長期 (差異化)

- [ ] **家庭共享記帳**: 多使用者共用帳本 / 預算 (可由 `personnel_notification` 雛形延伸)。
- [ ] **台灣在地化**: 統一發票對獎、報稅可扣除支出標記 (tax category)。
- [ ] **現金流預測**: 依週期交易 + 預算預測未來餘額曲線、低餘額預警。
- [ ] **訂閱偵測**: 自動找出重複扣款的訂閱服務。
- [ ] **稽核紀錄 / 變更歷史**: 交易修改 log。
- [ ] **銀行同步**: Open Banking / Plaid 類自動匯入 (台灣難度高，長期)。

### 🔧 既有功能微調 (Backlog — 小項)

- [ ] **交易複製**: 快速複製歷史交易。
- [ ] **分期交易連動更新**: 更新某期分期金額時支援兩種模式：
  - **僅更新單筆**: 只修改該期金額 (現行行為)。
  - **連動後續期數**: 修改後自動將剩餘總額重新分配到後續未處理期數。
    > 範例：6000 分六期 (每期 1000)，前 3 期已完成，第 4 期改為 2000 → 剩餘 1000 平分至第 5、6 期 (各 500)。
