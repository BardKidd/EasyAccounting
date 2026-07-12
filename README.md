# EasyAccounting

EasyAccounting 是一個現代化的個人記帳與資產管理應用程式，旨在提供直觀且強大的財務管理體驗。本專案採用 Monorepo 架構開發，結合了高效的現代網頁技術與穩健的後端服務。

## ✨ 特色功能

- **全方位記帳功能**
  - 支援收入、支出、轉帳等多種交易類型
  - **定期交易 (Recurring Transactions)**：支援設定週期性收支，自動產生未來交易紀錄
  - **階層式的自訂分類系統**：彈性的分類管理
- **資產與帳戶管理**
  - 支援多帳戶管理與資產追蹤
  - **多幣別支援 (Multi-currency)**：外幣帳戶、匯率換算與本位幣統一結算
  - **對帳系統 (Reconciliation)**：幫助使用者核對實際資產與系統紀錄
- **AI 與智慧化輔助**
  - **PDF 帳單解析**：支援上傳信用卡或銀行 PDF 帳單，自動解析並匯入交易
  - **AI 智能客服 / 助手**：透過對話方式提供帳務查詢與協助
- **預算控制 (Budget System)**
  - 設定整體或特定分類的預算，並追蹤達成率與超支警告
- **強大的報表分析**
  - 互動式圖表 (基於 ECharts) 展示資產趨勢、消費分佈與排行榜
  - 支援 Excel 匯入與匯出功能，方便資料備份與遷移
- **自動化與系統通知**
  - 每日記帳提醒、對帳提醒
  - 系統公告 (Announcements) 推播
  - 每週／每月財務報表自動寄送 (整合 Resend 與 React Email)
- **現代化介面與體驗**
  - 簡潔美觀的 UI 設計 (基於 Tailwind CSS 與 Radix UI)
  - 支援淺色/深色模式
  - 提供訪客模式 (Guest Login)，無痛體驗系統功能

## 🛠️ 技術棧 (Tech Stack)

本專案使用 **Turborepo** 進行 Monorepo 管理。

### Frontend (`apps/frontend`)

- **Framework**: [Next.js](https://nextjs.org/)
- **Language**: TypeScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/), `tw-animate-css`
- **UI Components**: [Shadcn/ui](https://ui.shadcn.com/), [Radix UI](https://www.radix-ui.com/), [Lucide React](https://lucide.dev/), [Sonner](https://sonner.emilkowal.ski/)
- **Forms & Validation**: React Hook Form, Zod
- **Data Fetching**: [SWR](https://swr.vercel.app/)
- **Visualization**: [ECharts for React](https://git.hust.cc/echarts-for-react/)
- **Testing**: [Vitest](https://vitest.dev/) (jsdom), [Playwright](https://playwright.dev/) (E2E)
- **Dev Port**: `8080`

### Backend (`apps/backend`)

- **Framework**: [Express](https://expressjs.com/) 5（以 `tsx` 直接執行 TS，無 build 步驟）
- **Database**: [Sequelize](https://sequelize.org/) (PostgreSQL，主資料庫，schema `accounting`) + [Mongoose](https://mongoosejs.com/) (MongoDB，知識庫 / AI chat)
- **Email**: [Resend](https://resend.com/), [React Email](https://react.email/)
- **Authentication**: JWT，存於 httpOnly cookie（access / refresh token）
- **Job Scheduling**: Node-cron
- **File Handling**: Multer, ExcelJS
- **Bill Parsing**: [Azure Service Bus](https://azure.microsoft.com/products/service-bus)（佇列）+ [Azure Blob Storage](https://azure.microsoft.com/products/storage/blobs) + LLM（同 process worker）
- **Testing**: [Vitest](https://vitest.dev/), [Supertest](https://github.com/ladjs/supertest)

### Shared Packages (`packages/`)

- `@repo/shared`: 共用的 TypeScript 型別定義、Zod Schema 與驗證邏輯
- `@repo/eslint-config`: 統一的 ESLint 設定
- `@repo/typescript-config`: 統一的 TypeScript 設定

## ☁️ 部署 (Deployment)

- **Frontend**: Hosted on [Vercel](https://vercel.com)
  - Production: [riinouo-eaccounting.win](https://riinouo-eaccounting.win)
  - Development: [dev.riinouo-eaccounting.win](https://dev.riinouo-eaccounting.win)
- **Backend**: Hosted on [Railway](https://railway.com/)

## 🚀 快速開始 (Getting Started)

### 前置需求

- [Node.js](https://nodejs.org/) (>= 24.14.1)
- [pnpm](https://pnpm.io/)（強制套件管理器）
- [PostgreSQL](https://www.postgresql.org/) 資料庫（主資料庫）
- [MongoDB](https://www.mongodb.com/) 資料庫（知識庫 / AI chat）

### 安裝依賴

```bash
pnpm install
```

## 📜 常用指令

| 指令                 | 說明                       |
| -------------------- | -------------------------- |
| `pnpm dev`           | 啟動開發模式 (包含前後端)  |
| `pnpm build`         | 建置所有應用與套件         |
| `pnpm lint`          | 執行程式碼檢查             |
| `pnpm format`        | 使用 Prettier 格式化程式碼 |
| `pnpm check-types`   | 執行 TypeScript 型別檢查   |
| `pnpm test`          | 執行所有測試               |

### Backend 特定指令 (需進入 `apps/backend`)

| 指令                   | 說明                    |
| ---------------------- | ----------------------- |
| `pnpm db:migrate`      | 建立新的 Migration 檔案 |
| `pnpm db:migrate:up`   | 執行資料庫遷移          |
| `pnpm db:migrate:down` | 還原上一次的遷移        |
| `pnpm email`           | 預覽電子郵件樣板        |

## 📂 詳細專案結構 (Project Structure)

### Backend (`apps/backend`)

```
apps/backend/src
├── controllers/    # 處理 HTTP Request 的控制器 (Controller Layer)
├── cron/           # 排程任務邏輯 (Cron Jobs)
├── emails/         # React Email 郵件樣板
├── excelColumns/   # Excel 匯入/匯出欄位定義
├── logic/          # 複雜純運算邏輯 (如 budgetLogic)
├── middlewares/    # Express Middlewares (Auth, Logging, Error Handling)
├── models/         # Sequelize / Mongoose Models (Database Schema)
├── routes/         # API 路由定義
├── services/       # 核心業務邏輯 (Service Layer)
├── types/          # 後端 TypeScript 型別定義
├── utils/          # 共用工具函式 (DB 連線, Helper functions)
├── validation/     # 請求驗證 middleware (衍生自 @repo/shared)
├── worker.ts       # Bill Parse Worker (Azure Service Bus)
└── app.ts          # 應用程式進入點 (Entry Point)
```

### Frontend (`apps/frontend`)

```
apps/frontend/src
├── app/            # Next.js App Router 頁面與 Layout (route groups: (auth) / (main))
├── assets/         # 靜態資源
├── components/     # React UI 元件 (包含 landing, ui 等)
├── contexts/       # React Context Providers
├── hooks/          # Custom React Hooks
├── lib/            # 工具函式與第三方庫設定 (apiHandler 等)
├── mocks/          # 測試用 mock 資料
├── services/       # 前端 API 呼叫封裝 (透過 SWR)
└── proxy.ts        # 路由守衛 (依 cookie token 導向 /login)
```

---

## 📝 筆記與備註

- 待開發的功能詳見 `apps/backend/todo.md` 與 `docs/specs/` 目錄下的規格文件。
- **規則引擎 / 自動分類（進行中）**：匯入時自動套用分類與標籤，規格見 `docs/specs/rules-engine-spec.md`。