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

- [x] **匯出功能**:
  - [x] 匯出交易記錄 (支援日期範圍篩選)。
  - [ ] 匯出月度報表。
  - [x] 上傳生成的 Excel 至 Azure Blob，並回傳下載連結 (SAS Token 或 Public URL)。
- [x] **匯入功能**:
  - [x] 下載範本格式。
  - [x] 上傳 Excel 檔案至 Azure Blob (存檔備份)。
  - [x] 解析 Excel 並批次寫入交易記錄 (Batch Insert)。

### 2. 總資產計算優化

- [x] 製作 `AssetTrendChart` 資料與圖表，使用倒推法 (Backward Calculation) 即時計算每月資產，無需額外 Table。
- [x] 前端實作 ECharts dataZoom 與雙軸顯示。

### 2.5 測試策略 (Testing Strategy)

- [x] **Unit & Integration Tests** (Backend):
  - 使用 **Vitest** + **Supertest**。
  - 已完成: Notification, Excel, Category, Transaction 等核心模組測試。
- [x] **E2E Tests** (Frontend):
  - 使用 **Playwright**。
  - 建立 E2E 測試環境與基礎測試案例 (Login, Navigation)。

### 2.6 新增 Github Action (CI)

- [ ] 設定自動化測試與 Lint 檢查。

### 3. 部署與運維 (Deployment & DevOps)

- [x] **Deployment Setup**:
  - [x] **Frontend**: 部署至 **Vercel**。
    - Production: `riinouo-eaccounting.win`
    - Development: `dev.riinouo-eaccounting.win`
  - [x] **Backend**: 部署至 **Railway**。
    - 採用 Docker/Nixpacks 部署策略。
- [x] **CI/CD**:
  - [x] Refine Github Actions workflow for automated testing and deployment.

### 4. 信用卡功能規劃

- [ ] 自動繳款紀錄、循環利息計算等進階功能。

### 5. 不同幣別換算 (Multi-currency)

- [ ] 支援多種貨幣與匯率換算。
- [ ] MVP 暫不包含，未來實作。

### 6. 預算功能開發

- [ ] 基礎預算設定與超支提醒。

### 7. 交易功能增強

- [ ] **支援 0 元交易**: 允許輸入金額為 0 (例如：全額折扣、免費贈品)，需調整後端驗證邏輯解除最小金額限制。

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

## � 詳細專案結構 (Project Structure)

本專案為 Monorepo 架構，主要分為 Backend (Express) 與 Frontend (Next.js)。

### Backend (`apps/backend`)

```
apps/backend/src
├── config/         # 環境變數與設定檔
├── controllers/    # 處理 HTTP Request 的控制器 (Controller Layer)
├── cron/           # 排程任務邏輯 (Cron Jobs)
├── emails/         # React Email 郵件樣板
├── middlewares/    # Express Middlewares (Auth, Logging, Error Handling)
├── models/         # Sequelize Models (Database Schema)
├── routes/         # API 路由定義
├── services/       # 核心業務邏輯 (Service Layer)
├── utils/          # 共用工具函式 (DB 連線, Helper functions)
└── app.ts          # 應用程式進入點 (Entry Point)
```

### Frontend (`apps/frontend`)

```
apps/frontend/src
├── app/            # Next.js App Router 頁面與 Layout
├── components/     # React UI 元件
│   ├── landing/    # 首頁相關元件
│   ├── ui/         # 共用 UI 元件 (Shadcn/UI)
│   └── ...
├── hooks/          # Custom React Hooks
├── lib/            # 工具函式與第三方庫設定
├── services/       # 前端 API 呼叫封裝
└── types/          # 前端 TypeScript 型別定義
```

### Packages (`packages/`)

- `shared`: 前後端共用的邏輯 (Zod Schemas, Types)。
- `eslint-config`: 統一的 Lint 規則。
- `typescript-config`: 統一的 TSConfig。

---

## �📌 筆記與備註

- 此專案目前採用 Monorepo 架構 (TurboRepo)。
