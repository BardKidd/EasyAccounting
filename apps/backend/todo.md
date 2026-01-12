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
  - Backend: Vitest + Supertest.
  - Frontend: Playwright E2E.
- [x] **部署架構 (Deployment)**:
  - Frontend: Vercel.
  - Backend: Railway.
- [x] **CI/CD**: Basic Github Actions workflow.

---

## 🚧 開發中 / 待辦清單 (Roadmap)

### 1. 信用卡進階管理 (Credit Card Management) - Priority High

- [ ] **帳單週期管理**: 區分帳單日 (Statement Date) 與 繳款日 (Payment Date)。
- [ ] **繳款紀錄**: 實作「繳卡費」轉帳類別，自動從銀行帳戶扣款並沖銷信用卡未出帳金額。
- [ ] **分期付款**: (Future) 支援消費分期設定，自動計算每月應繳金額。

### 2. 預算系統 (Budget System) - Priority High

- [ ] **預算設定**: 支援按「月」設定總預算與個別分類預算。
- [ ] **監控儀表板**: 新增預算達成率 Widget，視覺化顯示剩餘額度。
- [ ] **超支提醒**: (Future) 預算使用達 80%/100% 時發送通知。

### 3. 交易功能增強 (Transaction Enhancements)

- [ ] **0 元交易**: 支援全額折抵或贈品紀錄。
- [ ] **交易複製**: 快速複製歷史交易。
- [ ] **週期性交易**: 設定固定收支 (如房租、訂閱制)，自動建立交易紀錄。

### 4. 多幣別支援 (Multi-currency) - Backlog

- [ ] 獲取即時匯率，支援外幣帳戶與交易換算。
