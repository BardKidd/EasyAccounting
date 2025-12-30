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

### 自動化通知 (Automation)

- [x] **Email 服務**: 整合 **Resend** 發送郵件。
- [x] **排程任務 (Cron Jobs)**:
  - 每日 (9:00 AM): 每日記賬提醒。
  - 每週 (週一 9:00 AM): 上週收支摘要。
  - 每月 (5號 9:00 AM): 上月財務分析報告。

### 系統功能

- [x] **系統公告**: 使用 **MongoDB (Mongoose)** 儲存公告資訊 (混合架構練習)。
- [x] **軟刪除 (Soft Delete)**: 重要資料 (User, Transaction 等) 支援軟刪除與還原。

---

## 🚧 開發中 / 待辦清單 (Roadmap)

### 1. Excel 匯入/匯出 (Excel Import/Export) - Next Priority

> 使用 `exceljs` 處理檔案，並儲存於 `Azure Blob Storage`。

- [ ] **匯出功能**:
  - [ ] 匯出交易記錄 (支援日期範圍篩選)。
  - [ ] 匯出月度報表。
  - [ ] 上傳生成的 Excel 至 Azure Blob，並回傳下載連結 (SAS Token 或 Public URL)。
- [ ] **匯入功能**:
  - [ ] 下載範本格式。
  - [ ] 上傳 Excel 檔案至 Azure Blob (存檔備份)。
  - [ ] 解析 Excel 並批次寫入交易記錄 (Batch Insert)。

### 2. 總資產計算優化

- [ ] 建立 `UserAssetHistory` 表，每日記錄 User 總資產。
- [ ] 避免每次都重新計算，改為讀取歷史紀錄。

### 2.5 新增 UT (Unit Tests)

- [ ] 增加後端業務邏輯單元測試。

### 2.6 新增 Github Action (CI)

- [ ] 設定自動化測試與 Lint 檢查。

### 3. 信用卡功能規劃

- [ ] 自動繳款紀錄、循環利息計算等進階功能。

### 4. 不同幣別換算 (Multi-currency)

- [ ] 支援多種貨幣與匯率換算。
- [ ] MVP 暫不包含，未來實作。

### 5. 部署與運維

- [ ] **Containerization**: 撰寫 `Dockerfile` 與 `docker-compose.yml`。
- [ ] **Azure Deployment**: 部署至 Azure App Service。

### 6. 預算功能開發

---

## 🛠️ 技術棧 (Tech Stack)

### Backend

- **Framework**: Express.js
- **Database**:
  - PostgreSQL (Sequelize ORM) - 核心業務資料
  - MongoDB (Mongoose) - 系統公告、Log
- **Services**:
  - `node-cron` (排程)
  - `nodemailer` / `resend` (郵件)
  - `exceljs` (報表)
  - `@azure/storage-blob` (檔案儲存)

### Frontend

- **Framework**: Next.js 14+ (App Router)
- **UI Library**: Shadcn/UI (Tailwind CSS)
- **State Management**: React Hooks
- **Charts**: EChart.js

---

## 📌 筆記與備註

- 此專案目前採用 Monorepo 架構 (TurboRepo)。
