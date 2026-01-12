# EasyAccounting

EasyAccounting 是一個現代化的個人記帳與資產管理應用程式，旨在提供直觀且強大的財務管理體驗。本專案採用 Monorepo 架構開發，結合了高效的現代網頁技術與穩健的後端服務。

## ✨ 特色功能

- **全方位記帳功能**：
  - 支援收入、支出、轉帳等多種交易類型
  - 支援多帳戶管理與資產追蹤
  - 階層式的自訂分類系統
- **強大的報表分析**：
  - 互動式圖表 (基於 ECharts) 展示資產趨勢與消費分佈
  - 支援 Excel 匯入與匯出功能，方便資料備份與遷移
- **自動化通知**：
  - 每日記帳提醒
  - 每週／每月財務報表自動寄送 (整合 Resend 與 React Email)
- **現代化介面**：
  - 簡潔美觀的 UI 設計 (基於 Tailwind CSS 與 Radix UI)
  - 支援淺色/深色模式
  - 響應式設計，適配各種裝置

## 🛠️ 技術棧 (Tech Stack)

本專案使用 **Turborepo** 進行 Monorepo 管理。

### Frontend (`apps/frontend`)

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/), `tw-animate-css`
- **UI Components**: [Radix UI](https://www.radix-ui.com/), [Lucide React](https://lucide.dev/) (Icons), [Sonner](https://sonner.emilkowal.ski/) (Toasts)
- **Forms & Validation**: React Hook Form, Zod (via `@repo/shared`)
- **Visualization**: [ECharts for React](https://git.hust.cc/echarts-for-react/)
- **Testing**: [Playwright](https://playwright.dev/)

### Backend (`apps/backend`)

- **Framework**: [Express](https://expressjs.com/)
- **Database ORM**: [Sequelize](https://sequelize.org/) (PostgreSQL)
- **Email**: [Resend](https://resend.com/), [React Email](https://react.email/)
- **Authentication**: JWT (JSON Web Tokens)
- **Job Scheduling**: Node-cron
- **File Handling**: ExcelJS (Excel 處理), Multer (檔案上傳)
- **Testing**: [Vitest](https://vitest.dev/), [Supertest](https://github.com/ladjs/supertest)

### Shared Packages

- `@repo/shared`: 共用的 TypeScript 型別定義、Zod Schema 與驗證邏輯
- `@repo/eslint-config`: 統一的 ESLint 設定
- `@repo/typescript-config`: 統一的 TypeScript 設定

## ☁️ 部署 (Deployment)

- **Frontend**: Hosted on [Vercel](https://vercel.com)
  - Production: [riinouo-eaccounting.win](https://riinouo-eaccounting.win)
- **Backend**: Hosted on [Railway](https://railway.com/)

## 🚀 快速開始 (Getting Started)

### 前置需求

- [Node.js](https://nodejs.org/) (>= 18)
- [pnpm](https://pnpm.io/) (建議使用)
- [PostgreSQL](https://www.postgresql.org/) 資料庫

### 安裝依賴

```bash
pnpm install
```

### 環境變數設定

請確保在 `apps/backend` 與 `apps/frontend` 目錄下建立對應的 `.env` 檔案，並填入必要的環境變數（如資料庫連線字串、JWT Secret、Resend API Key 等）。

### 資料庫遷移 (Backend)

在 `apps/backend` 目錄下執行：

```bash
pnpm db:migrate:up
```

### 啟動開發伺服器

在專案根目錄執行以下指令，將同時啟動 Frontend 與 Backend：

```bash
pnpm dev
# 或
turbo deviation
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8080 (預設)

## 📜 常用指令

| 指令               | 說明                       |
| ------------------ | -------------------------- |
| `pnpm dev`         | 啟動開發模式 (包含前後端)  |
| `pnpm build`       | 建置所有應用與套件         |
| `pnpm lint`        | 執行程式碼檢查             |
| `pnpm format`      | 使用 Prettier 格式化程式碼 |
| `pnpm format`      | 使用 Prettier 格式化程式碼 |
| `pnpm check-types` | 執行 TypeScript 型別檢查   |
| `pnpm test`        | 執行所有測試               |

### Backend 特定指令 (需進入 `apps/backend`)

| 指令                   | 說明                    |
| ---------------------- | ----------------------- |
| `pnpm db:migrate`      | 建立新的 Migration 檔案 |
| `pnpm db:migrate:up`   | 執行資料庫遷移          |
| `pnpm db:migrate:down` | 還原上一次的遷移        |
| `pnpm email`           | 預覽電子郵件樣板        |

## 📂 專案結構

```
.
├── apps
│   ├── backend    # Express API Server
│   └── frontend   # Next.js Application
├── packages
│   ├── eslint-config
│   ├── shared     # Shared types & schemas
│   ├── typescript-config
│   └── ui         # Shared UI components (optional)
└── ...
```
