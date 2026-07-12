# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

EasyAccounting 是個人記帳與資產管理應用，採 Turborepo + pnpm Monorepo。前端 Next.js 部署於 Vercel，後端 Express 部署於 Azure Container Apps。

> **進行中：規則引擎（自動分類）** — 任何與規則引擎 / 自動分類 / `MerchantMapping` / 匯入自動套分類或標籤相關的工作，**動工前必須先完整讀 `docs/specs/rules-engine-spec.md`**（唯一真實來源，決策 R1–R14 已於 2026-07-11 拍板不可自行更改）。本規格一併修復既有 `merchant_mapping` 全域表**跨使用者洩漏 bug**（無 `userId`，會把 A 使用者私有 `categoryId` 回給 B）；照其中 Phase 分段與進度追蹤執行，勿自行改方向。
>
> **多幣別功能（Phase 0–3 已完成 ✅ 2026-06-09）** — 動任何多幣別 / 匯率 / 外幣帳戶 / 本位幣 / NTD→TWD 相關程式前，仍以 `docs/multicurrency-implementation-plan.md` 為唯一真實來源：決策 D1–D9 使用者已拍板不可自改（尤 D4「NTD→TWD 全域」、D5「Budget 只用本位幣」）。

## Monorepo 結構

- `apps/backend` — Express 5 + TypeScript API（套件名 `backend`）。以 `tsx` 直接執行 TS 原始碼，無 build 步驟。
- `apps/frontend` — Next.js 16 App Router（套件名 `frontend`），開發埠 `8080`。
- `packages/shared`（`@repo/shared`）— **前後端共用的單一真實來源**：Zod schemas、TypeScript 型別、常數 enum、驗證邏輯。以 TS 原始碼被消費（`main` 指向 `src/index.ts`，無編譯產物）。改動此處同時影響前後端。
- `packages/eslint-config`、`packages/typescript-config` — 共用設定。

## 常用指令

根目錄（透過 turbo 跨所有 workspace）：

```bash
pnpm install            # 安裝（pnpm 為強制套件管理器，node >= 24.14.1）
pnpm dev                # 同時啟動前後端
pnpm build              # 建置全部
pnpm lint               # 全部 lint
pnpm check-types        # 全部型別檢查（單一 package 修改後驗證的首選）
pnpm format             # Prettier
```

後端（`cd apps/backend`）：

```bash
pnpm dev                # tsx watch src/app.ts
pnpm test               # vitest（watch）— 需可連線的 PostgreSQL
pnpm test:run           # vitest 單次
pnpm test:run path/to/file.test.ts   # 執行單一測試檔
pnpm test:run -t "名稱"               # 依測試名稱過濾
pnpm db:migrate:up      # 套用 migration
pnpm db:migrate:down    # 還原上一個 migration
pnpm db:migrate         # 互動式建立新 migration（會 prompt 名稱）
pnpm email              # React Email 樣板預覽（埠 3001）
```

前端（`cd apps/frontend`）：

```bash
pnpm dev                # next dev -p 8080
pnpm test:run           # vitest（jsdom）單次
pnpm test:run src/lib/calendarUtils.test.ts   # 單一測試檔
pnpm test:e2e           # Playwright（testDir e2e，baseURL :8080，需先啟動 app）
pnpm test:e2e:ui        # Playwright UI 模式
```

## 後端架構

**分層**：`routes/` → `controllers/` → `services/`（業務邏輯）→ `models/`。複雜純運算另放 `logic/`（如 `budgetLogic.ts`）。所有路由在 `src/app.ts` 統一掛載於 `/api` 前綴。Path alias `@/*` → `src/*`（tsconfig 與 vitest 皆已設定）。

**雙資料庫**：
- **PostgreSQL（Sequelize）** 為主資料庫，schema 名為 `accounting`。執行時模型定義在 `src/models/`，於 `src/app.ts` 透過 `import '@/models'` 載入。
- **MongoDB（Mongoose）** 用於知識庫 / chat 相關（`mongoConnection`、`knowledgeChunk` 等）。
- ⚠️ **migration 與 runtime 模型分離**：`sequelize-cli` 經 `.sequelizerc` 指向 `apps/backend/database/`（`config.js`、`migrations/`、`models/`、`seeders/`），與 `src/models/` 是**不同**目錄。改 schema 要同時更新 `src/models/` 的模型與 `database/migrations/` 的 migration。
- **Soft-delete 串接刪除**：`src/models/index.ts` 用 Sequelize `afterDestroy` hook 串接清理子資料（刪 User 連帶刪 Transaction/Account/Budget…），務必帶 `individualHooks: true`。

**背景作業**：`src/app.ts` 啟動時直接呼叫 `cron/` 內的排程（每日提醒、週/月報表、定期交易產生、訪客清理）。

**Bill Parse Worker**：PDF 帳單解析採 **Azure Service Bus 佇列 + 同 process worker**（`src/worker.ts`，由 `app.ts` 的 `initBillParseWorker()` 啟動）。Worker 與 SSE 共用同一 EventEmitter（同 process 設計）。`NODE_ENV=test` 或無 `AZURE_SERVICE_BUS_CONNECTION_STRING` 時跳過。流程：Service Bus 訊息 → 從 Azure Blob 下載前端轉好的圖片 → 送 LLM 解析 → 存 `PendingTransaction` → 更新 telemetry。

**認證**：JWT 存於 httpOnly cookie（`accessToken` / `refreshToken`）。`authMiddleware` 在 access token 失效時自動用 refresh token 換發新 access token；竄改則強制登出。CORS 僅允許 `ORIGIN_URL`，且 `credentials: true`。

## 前端架構

- **App Router**，route group 分為 `(auth)`（登入/註冊/重設密碼）與 `(main)`（已驗證的主應用）。
- **資料層**：`src/services/` 每個檔對應一組 API，全部透過 `src/lib/utils.ts` 的 `apiHandler` 呼叫後端，base URL 取自 `NEXT_PUBLIC_API_DOMAIN`。前端**直接打後端**（非 Next.js rewrite proxy）。資料抓取用 SWR。
- **路由守衛**：`src/proxy.ts` 依 cookie 中的 token 判斷是否導向 `/login`。
- **UI**：shadcn/ui + Radix UI、Tailwind CSS v4、ECharts（圖表）、React Hook Form + Zod（表單，resolver 接 `@repo/shared` schema）、Sonner（toast）、next-themes（淺/深色）。

## 跨層慣例

- 新增/修改 API 的請求或回應形狀時，先改 `@repo/shared` 的 Zod schema 與型別，前端表單與後端 `validate` middleware 都從同一 schema 衍生，避免前後端不一致。
- 後端測試 `fileParallelism: false`（vitest config），因多檔共用同一 DB 會在平行 sync 時衝突；新增 DB 相關測試勿假設可平行。

## 工作流程路由（task → tool）

同功能有多把刀，**動工前先依任務定「進場工具」，一條主線做到底、別中途換刀**。子工具在主線之下輔助即可。

| 任務 | 進場（主線） | 備援 / 子工具 |
|---|---|---|
| 新功能 / 改行為 | `superpowers:brainstorming` → 定案後 `writing-plans` | `grill-me` / `grill-with-docs` 壓力測試 plan |
| 找 / 讀既有程式 | GitNexus `query` / `context`（本 repo 已索引，勿 grep 找流程） | `Explore` agent（未索引處）；`cavecrew-investigator`（長 session 省 context） |
| 改任何 symbol 前 | GitNexus `impact`（upstream，回報 blast radius；HIGH/CRITICAL 先警告） | — |
| commit 前 | GitNexus `detect_changes`（比對 `main` 確認只碰預期範圍） | — |
| 除錯 / 測試失敗 / 非預期行為 | `superpowers:systematic-debugging`（**唯一預設**，勿再另跑 `diagnose`） | — |
| 前端 UI（新建 / 改版 / UX 審查） | `impeccable`（**強制進場**，見下方 UI 設計慣例） | `frontend-design` 補美學；`ui-ux-pro-max` 色盤/字體；`chrome-devtools` / `playwright` 驗證 |
| API 請求/回應形狀改動 | 先改 `@repo/shared` Zod schema（見上方跨層慣例） | — |
| 實作程式 | TDD 先測後碼（`superpowers:test-driven-development` / `tdd`） | `context7` 查外部 library 文件 |
| 找 bug 的 review | `code-review` skill | `cavecrew-reviewer` 快掃 diff |
| 純清理 / 簡化（不找 bug） | `simplify` / `code-simplifier` | — |
| 拆 plan 成 issue / PRD | `to-issues` / `to-prd` | — |
| commit / push / PR（**僅使用者明說**，且不在 `main` 直接動） | `commit-commands` | `caveman-commit` 產訊息 |

底層 hooks/config 已自動生效，無需手動叫：`rtk`（Bash token 改寫）、caveman、impeccable PostToolUse（UI 改動檢查）、GitNexus 索引。

## 環境變數重點

後端需 `PG_USER/PG_PASSWORD/PG_DATABASE/PG_HOST/PG_PORT`（schema 固定 `accounting`，雲端 host 自動開 SSL）、`ORIGIN_URL`（CORS 白名單）、`AZURE_SERVICE_BUS_CONNECTION_STRING` 與 `AZURE_BLOB_CONNECTION_STRING`（帳單解析）、`RESEND_API_KEY`（寄信）、LLM 金鑰、MongoDB 連線。前端需 `NEXT_PUBLIC_API_DOMAIN`。

## UI 設計慣例

- 任何前端 UI 工作（新建或改版介面、元件、表單、排版、配色、動效、UX 審查）**動工前先叫 `impeccable` skill**（或使用者打 `/impeccable`），依其指引定方向再實作。

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **EasyAccounting** (4167 symbols, 8990 relationships, 289 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/EasyAccounting/context` | Codebase overview, check index freshness |
| `gitnexus://repo/EasyAccounting/clusters` | All functional areas |
| `gitnexus://repo/EasyAccounting/processes` | All execution flows |
| `gitnexus://repo/EasyAccounting/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
