# Project Status & Roadmap: Personal Accounting App

## 📝 專案目標

建立一個功能完整的個人記帳系統，整合 SQL (關聯資料) 與 NoSQL (非結構化資料) 架構，並實作完整的自動化通知與報表功能。

---

## ✅ 已完成功能 (Current Status)

### 核心功能 (Core Features)

- [x] **使用者系統**: 註冊、登入 (JWT)、個人資料管理、密碼加密 (Bcrypt)。
- [x] **帳戶管理**:
  - 支援多種帳戶類型 (現金、銀行、信用卡)。
  - 信用卡專屬欄位 (額度、結帳日、繳款日、未出帳金額)。
- [x] **分類系統**:
  - 支援三階層分類模式(RootCategory, MainCategory, SubCategory)
  - 收入/支出分類管理。
- [x] **交易記錄**:
  - 收支記錄 CRUD。
  - 轉帳功能 (自動產生兩筆關聯交易)。
  - 自動更新帳戶餘額 (Wallet)。
- [x] **信用卡進階管理 (Credit Card Management)**:
  - [x] **資料庫架構**: `CreditCardDetail` Table (結帳日、繳款日、額度)、`InstallmentPlan` Table (分期母計畫)。
  - [x] **帳單週期邏輯**: 支援 `billingDate` 自動歸屬帳單月份 (Implemented in `createTransaction`).
  - [x] **分期付款 (Installment)**: 建立分期交易 (自動展開 N 期)、餘額與額度計算 (總額佔用額度)。
  - [x] **繳款紀錄**: 使用轉帳 (Transfer) 邏輯實作，支援從銀行帳戶繳款。
- [x] **交易功能增強 (Transaction Enhancements)**:
  - [x] **0 元交易**: 支援全額折抵或贈品紀錄 (Net Amount = 0, UI 顯示綠色)。
  - [x] **額外金額結構 (Transaction Extra)**: 資料表 `TransactionExtra` (手續費、折扣)、實際金額 (Net Amount) 計算公式、負數輸入自動轉正邏輯。

### 統計與報表 (Statistics)

- [x] **儀表板總覽**: 淨資產、各帳戶餘額、近期收支趨勢。
- [x] **圖表分析**:
  - 收支趨勢折線圖 (Trend Chart)。
  - 分類支出圓餅圖 (Pie Chart)。
  - 月度收支統計。
  - [x] **總資產趨勢圖 (Asset Trend Chart)**: 雙 Y軸圖表 (ECharts)，結合收支柱狀圖與總資產折線圖 (含 Zoom 功能)。
  - [x] **總資產計算優化**: 實作倒推法 (Backward Calculation) 即時計算每月資產。

### 自動化通知 (Automation)

- [x] **Email 服務**: 整合 **Resend** 發送郵件。
- [x] **排程任務 (Cron Jobs)**:
  - 每日 (9:00 AM): 每日記賬提醒。
  - 每週 (週一 9:00 AM): 上週收支摘要。
  - 每月 (5號 9:00 AM): 上月財務分析報告。

### 系統功能

- [x] **系統公告**: 使用 **MongoDB (Mongoose)** 儲存公告資訊 (混合架構練習)。
- [x] **軟刪除 (Soft Delete)**: 重要資料 (User, Transaction 等) 支援軟刪除與還原。
- [x] **Excel 匯入/匯出**: 整合 Azure Blob Storage 與 ExcelJS，完整支援交易記錄匯入與備份導出。

### 工程與運維 (Engineering & DevOps)

- [x] **測試策略 (Testing)**:
  - Backend: Vitest (Unit Test)。
    > Follow `backend-testing-standard`: 全面使用 Mock 隔離資料庫與外部依賴，專注於業務邏輯驗證，確保 CI/CD 執行效率。
  - Frontend: Playwright E2E。
- [x] **部署架構 (Deployment)**:
  - Frontend: Vercel.
  - Backend: Railway.
- [x] **CI/CD**: Basic Github Actions workflow.

---

## 🚧 開發中 / 待辦清單 (Roadmap)

### 1. 預算系統 (Budget System) - Priority High

> 📄 **技術規格**: [budget-system-spec.md](../../docs/specs/budget-system-spec.md)

- [ ] **核心功能**:
  - [ ] 預算專案 CRUD (支援年/月/週/日週期)
  - [ ] 子預算 (分類級別額度設定)
  - [ ] 自訂週期起始日
  - [ ] 重複循環 vs 單次預算
  - [ ] 餘額結轉 (Rollover)
- [ ] **交易整合**:
  - [ ] 交易表單新增「歸入預算」多選欄位
  - [ ] TransactionBudget 關聯表
- [ ] **監控儀表板**:
  - [ ] 預算卡片 Widget (進度條、使用率、倒數天數)
  - [ ] 顏色規則 (<80% 綠色 / 80-99% 橘色 / ≥100% 紅色)
- [ ] **Alert 系統**:
  - [ ] 80%/100% 超支提醒 (Email + In-App)
- [ ] **進階功能**:
  - [ ] 回溯補帳遞迴重算 (Async Queue)
  - [ ] 週期快照 (Snapshot) 保護歷史資料
  - [ ] 惰性快照建立 (Lazy Evaluation)

### 2. 交易功能增強 (Transaction Enhancements) - Todo only

- [ ] **交易複製**: 快速複製歷史交易。
- [ ] **週期性交易**: 設定固定收支 (如房租、訂閱制)，自動建立交易紀錄。

### 3. 多幣別支援 (Multi-currency) - Backlog

- [ ] 獲取即時匯率，支援外幣帳戶與交易換算。
