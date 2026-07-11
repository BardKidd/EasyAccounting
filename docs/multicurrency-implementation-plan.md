# 多幣別功能實作計畫（EasyAccounting）

> 產出自多 agent 設計辯論（A 極簡務實 / B 完整健壯 / C 擴充優先）後的綜合裁決，並已套用使用者拍板的三項決策。
> 狀態：**待審核，尚未動工**。

---

## 給接手 session 的指示（請先讀這段）

1. **這份文件是多幣別功能的唯一真實來源（single source of truth）。** 動工前完整讀過第 0 節「已鎖定的設計決策」與要實作的該 Phase 全文。
2. **決策 D1–D9 已由使用者拍板，不要重新討論、不要自行更改**（特別是 D4「NTD→TWD 全域改」與 D5「Budget 只要本位幣」是使用者明確選的，不是預設值）。若你認為某決策有問題，先問使用者，不要自己改方向。
3. **嚴格照 Phase 0 → 1 → 2 → 3 順序做**，每個 Phase 是獨立可上線單位。除非使用者指定，否則一次只做一個 Phase 並等使用者確認後再進下一個。
4. **動工前先跑 `gitnexus_impact`**（見 CLAUDE.md 規範），完工前跑 `gitnexus_detect_changes`。
5. **每完成一項就更新下方「進度追蹤」勾選框**，讓後續 session 知道進度，避免重做或跳步。
6. Phase 3 才需處理的「開放問題 Q1/Q2」尚未拍板，做到那裡前要先問使用者。
7. 文件中所有 `檔名:行號` 是撰寫當下的位置；實作前用工具確認該位置仍正確（程式可能已變動）。

### 進度追蹤

- [x] **Phase 0** — NTD→TWD 全域正規化（獨立 PR）✅ 2026-06-09
  - [x] `@repo/shared` enum/DEFAULT_CURRENCY/ZERO_DECIMAL 改 TWD + `normalizeCurrencyCode`
  - [x] `excelServices` 匯入端 normalize 容錯（讀值後 normalize 再驗證；舊 NTD→TWD 合法別名）
  - [x] `formatCurrency`（前後端）參數化（`(val, currency='TWD')` + `isZeroDecimalCurrency` 決定精度）
  - [x] 全域 `grep "NTD"` 收尾 + 測試（新增 `normalizeCurrencyCode.test.ts`；excel 測試期望改 TWD；excel 單元 15/15、shared 5/5 綠）
- [x] **Phase 1** — 資料模型一次到位 + 回填（閘門：不開放外幣帳戶）✅ 2026-06-09
  - [x] `@repo/shared` schema/types（user/account/transaction types + currency.schema + SEED_CURRENCIES + roundToBaseCurrency）
  - [x] 新增 `Currency` / `ExchangeRate` 表（model + migration + seed；已套用至 DB 並驗證 7 幣別 + TWD→TWD=1）
  - [x] Account/User/Transaction/TransactionExtra/Budget 加欄/改欄（Transaction/Extra 用 beforeSave hook 由 amount×baseRate 集中算 amountInBase；budget 移除 currencyId、amount→DECIMAL(20,5)）
  - [x] cascade hook 隔離確認（Currency/ExchangeRate 不在 User.afterDestroy；FK RESTRICT）
  - [x] 對稱 migration + 回填（transaction 包裹、可逆；DB 驗證 amountInBase=amount 零差異、extra base 零差異、currencyId 已移除）
  - [x] `statisticsServices` 聚合改 base 欄位 + 移除金額 `::integer`（改 `::float8` 保 number 型別；COUNT 維持 integer；淨值改 getNetWorth byCurrency+totalInBase）
  - [x] 零回歸驗證（後端 151/151、前端 29/29、shared 5/5 全綠；src 型別 0 錯誤）
- [x] **Phase 2** — 手動匯率多幣別開燈 ✅ 2026-06-09（後端 + 前端 + LLM/Excel 全部完成並驗證）
  - [x] `@repo/shared` `CreateTransferSchema` 加 `targetAmount?`、交易 schema 加 `originalCurrencyCode?/originalAmount?/exchangeRate?`
  - [x] 後端交易建立：依帳戶幣別解析 baseRate / 原幣欄位（`resolveCurrencyFields` + `getRate`），hook 算 amountInBase
  - [x] 跨幣轉帳重寫：from=來源幣、to=目標幣（`targetAmount`），各 leg 自己的 baseRate；create/update/delete 全改寫
  - [x] extra base 快照改顯式寫入（移除 hook，pdf/recurring 同步補 base）
  - [x] 跨幣轉帳整合測試 4 情境（建立/改額/改幣/刪除）對真實 DB 全綠；單元 151 + 前端 29 零回歸
  - [x] 前端：帳戶表單開放 currencyCode 下拉（建立可選、編輯停用，用 `SEED_CURRENCIES`）
  - [x] 前端：跨幣轉帳 `targetAmount` 輸入（來源/目標幣別不同時顯示）
  - [x] 前端：淨值 byCurrency UI（`GET /api/statistics/net-worth` + `NetWorthCard` 掛在帳戶頁）+ 帳戶列餘額帶各自幣別
  - [x] LLM 確認流程：後端 confirm 算 baseRate + 原幣換算（帳單原幣≠帳戶幣別時記 originalCurrency/用 rate 表或前端補的匯率）；前端待確認表格加幣別不符警告橫幅
  - [x] Excel 匯入外幣：查表回算（共用 `createTransaction`，已生效）+ 缺匯率前置檢查 → 列入錯誤報告告警（`partitionByMissingRate`）
  - [x] 匯率/幣別查詢端點 `GET /api/exchange-rate`、`GET /api/currencies`（供前端建議匯率）
- [x] **Phase 3** — API 匯率 + 本位幣切換 ✅ 2026-06-09（後端 + 前端設定頁全部完成並驗證）
  - [x] `exchangeRateService`：`getRate` 加記憶體快取；`fetchRatesForBase`/`fetchAllActiveRates` 接外部 API（預設 exchangerate.host，可 env 覆寫）寫入 source='API'
  - [x] 每日匯率 cron（`exchangeRateCron`，06:00 Asia/Taipei；test/停用時跳過；已掛入 app.ts）
  - [x] 本位幣切換 service（Q1 歷史重算 amountInBase + extra base + 預算換算；缺匯率整批中止）+ `PATCH /api/user/base-currency` 端點
  - [x] 整合測試：本位幣切換 3 情境對真實 DB 全綠
  - [x] 前端：設定頁「貨幣設定」分頁本位幣切換 UI（`GET /api/auth/me` 帶 baseCurrencyCode + `PATCH /user/base-currency`，附重算警告確認）
  - [x] 前端：交易表單跨幣轉帳帶 API 建議匯率（`getSuggestedRate` + 「套用建議」一鍵填目標金額）

### Code Review 後續修正（2026-06-09）

完整 review（比對 git 變更 + 實跑測試）後：三套測試全綠（後端 158、前端 29、shared 11、`src` 型別 0 錯誤），但綠燈一度掩蓋一個真實路徑缺口。

- [x] **🔴 已修：跨幣轉帳「編輯」在 UI/HTTP 路徑沒接 `updateTransfer`，會損毀資料。**
  - 症狀：`PUT /transaction/:id` 走 `updateIncomeExpense`，其對向同步會把兩 leg 強制同額、且不更新對向 `baseRate`；用 UI 編輯一筆跨幣轉帳（即使沒改值）會把目標 leg 的 `amount`/`amountInBase` 與帳戶餘額寫壞。`updateTransfer` 當時只有 Excel 匯入與「整合測試直接呼叫 service」會用到，故測試綠但產品壞。
  - 修法：① `updateIncomeExpense` 入口依 DB `linkId` 委派給 `updateTransfer`（前端送的 `type` 不可靠，編輯轉帳會送 EXPENSE），並移除舊的對向同步死碼；② `updateTransactionSchema` 補 `targetAmount`；③ 前端 `handleUpdate` 編輯轉帳時帶 `targetAmount`。
  - 影響檔：`transactionServices.ts`、`packages/shared/.../transaction.schema.ts`、`transactionSheet.tsx`；單元測試 `transaction_service.test.ts` 的「LinkId Sync」改為驗證「委派 + 兩側同步」。修後後端 158 + 前端 29 全綠。
- [x] **🟢 已修：首頁 Dashboard 統計混幣加總。** `getTransactionsDashboardSummary`（`transactionServices.ts`，被 `/transaction/summary` 使用）原聚合原始 `amount`/`extraAdd`/`extraMinus`，未改 `amountInBase` 系列（§1.6 的聚合改寫只掃了 `statisticsServices.ts`，漏了這支平行聚合）。多幣別下收入/支出/結餘會把不同幣別當同單位相加。
  - 修法：比照 statistics，`findAll` 的 `attributes` 加 `amountInBase`、JS reduce 改讀 `amountInBase` / `extraAddInBase` / `extraMinusInBase`（單幣時 `amountInBase === amount`，零回歸）。影響檔：`transactionServices.ts`。
- [x] **🟢 已修：預算消耗未用 `amountInBase`，違反 D5。** `budgetService.ts` 原以 `Math.abs(Number(tx.amount))` 累計消耗，D5 明訂「消耗用 `amountInBase` 累計」。Model/migration 已把 `Budget.amount` 改 `DECIMAL(20,5)`、切換本位幣也會換算預算，唯獨消耗端讀取沒改。
  - 修法：4 處消耗累計（`calculateUsage` / `calculateBudgetCategoriesUsage` / `createSnapshot` / `recalculateSnapshots`）一律改讀 `tx.amountInBase`（單幣時等於 `amount`，零回歸）。同步補 `budget_impact.test.ts` mock 交易的 `amountInBase` 欄位（斷言 spent=300、80% 門檻不變，正好驗證零回歸）。影響檔：`budgetService.ts`、`tests/unit/budget_impact.test.ts`。修後後端 158 全綠。
    > 註（2026-07-11）：此後 budget 系統於 budget-ynab 改版整支重寫，`budget_impact.test.ts` 已不存在（改為 `budget_logic.test.ts` / `budgetFlow.test.ts`）；D5「消耗用 `amountInBase`」行為在現行 `budgetService.ts` 仍正確。此段為當時歷史記錄。
- [x] 🟢 已修（2026-06-10）雜項四項：
  - **① 過時註解**：`TransactionExtra.ts` 註解「由 beforeSave hook 算出」→「由 service 層顯式寫入（非 model hook）」。
  - **② 反向匯率掉精度**：`@repo/shared` 新增 `roundRate`（10 位，對齊 `DECIMAL(20,10)`）；`exchangeRateService.ts` 反向匯率取倒數改用 `roundRate`（原本誤用本位幣 5 位的 `roundToBaseCurrency`，小匯率如 1/157.5 會被截）。
  - **③ 週期交易外幣 baseRate**：`recurringTemplateService.processRecurringTemplates` 改為先載入帳戶、查 `User.baseCurrencyCode`（快取）、用 `getRate(帳戶幣別→本位幣, nextExecutionDate)` 解析 baseRate（缺匯率 fallback 1 並告警），Transaction 帶 `baseRate`（hook 算 `amountInBase`）、extra base 快照改 `roundToBaseCurrency(原值×baseRate)`。單幣零回歸。
  - **④ 趨勢圖單位漂移**：經 3 個 subagent（財務/架構/產品視角）辯論。**結論採「方案1 + `hasMultiCurrency` 旗標」**——因 `Account` 有 opening balance（建立時可輸入 `balance`，非交易驅動），「改用快照累積口徑當起點」的方案 2 系列會讓 `Σnetflow ≠ 帳戶餘額`、**連單幣都回歸**，違反硬指標，故否決。最終：`getAssetTrend` 演算法一字不改（起點維持 mark-to-market 現值、對齊淨值卡，符合 D1 歷史不被未來污染），上移已呼叫的 `getNetWorth` 算出 `hasMultiCurrency`（持有非本位幣帳戶），回傳改 `{ trend, hasMultiCurrency }`（shared 新增 `AssetTrendResult`）；前端趨勢圖在多幣別時顯示「≈ 近似」角標 + tooltip 說明歷史為近似值。單幣 `hasMultiCurrency=false`、曲線精確、零回歸。
  - 驗證：後端 158、前端 29 全綠；後端 `src` / 前端 / shared 型別 0 錯誤。相關測試（`statistics_service` query 序列改、`recurring_template_service` 補 `User` mock）同步更新。

---

## 0. 已鎖定的設計決策

| # | 決策 | 說明 |
|---|------|------|
| D1 | Transaction **雙存** `amount` + `amountInBase` | `amount` 鎖「帳戶幣別」→ 單幣查詢零改動；`amountInBase` 為「本位幣快照」→ 混幣聚合可直接 `SUM`，且歷史不被未來匯率污染 |
| D2 | 新增 `Currency` 表（`code` 為 PK）+ `ExchangeRate` 時間序列表 | 加幣別只需 seed 一列；歷史匯率是多幣淨值/淨值曲線的唯一正確來源 |
| D3 | 本位幣存 **User 層**：`User.baseCurrencyCode` | 報表/淨值用哪個幣別呈現屬個人偏好 |
| D4 | **NTD → TWD 一次性全域改**（使用者決定） | enum 正式值改 TWD；Excel 匯入端保留 `NTD→TWD` 容錯作為安全網 |
| D5 | **廢除** `Budget.currencyId`（INTEGER 殭屍欄位），預算一律本位幣 | 使用者決定只要本位幣預算；消耗用 `amountInBase` 累計 |
| D6 | `TransactionExtra` 新增 `extraAddInBase` / `extraMinusInBase` 本位幣快照 | 修補三家都漏的混幣手續費污染（統計 SQL 在 `SUM` 內 `amount + extraMinus - extraAdd`） |
| D7 | `PendingTransaction` **不加欄位**，沿用 JSONB `transactionData` | `transactionData` 已是 JSONB、`billParseService:295` 已寫入 currency |
| D8 | 分階段交付，Phase 1 以「禁止建非本位幣帳戶」為閘門 | schema 一次到位、功能逐階段開燈，避免淨值立即出錯 |
| D9 | **不在 MVP 承諾 crypto** | `DECIMAL(20,5)` 兌現不了 satoshi；`isCrypto` 旗標僅預留，未來獨立 Holding/報價模組處理 |

### 金額語意（全程一致）

- `transaction.amount` = **帳戶幣別**金額（帳戶 `currencyCode` 計價，永不換算）。
- `transaction.amountInBase` = `amount × baseRate`，本位幣（`user.baseCurrencyCode`）計價快照。
- `baseRate` = 交易當下「帳戶幣別 → 本位幣」匯率快照。
- `originalCurrencyCode` / `originalAmount` = 選填，記錄「我實際刷了 100 JPY」這類原幣事實。
- 本位幣 == 帳戶幣別時：`baseRate = 1`、`amountInBase = amount`（單幣使用者完全不變）。
- `TransactionExtra.extraAddInBase = extraAdd × baseRate`（extraMinus 同理）。

---

## Phase 0 — NTD → TWD 全域正規化（獨立 PR，可單獨上線）

**目標**：把既存的 NTD/TWD 分裂 bug 從多幣別功能中拆出，先降低後續 blast radius。目前 DB **沒有任何 currency 欄位持久化**（Account/Transaction 無此欄、Budget.currencyId 從未使用），唯一的歷史 NTD 來源是「使用者先前匯出的 Excel 檔」，故全域改名風險集中在 Excel 重匯入。

**改動清單**

- `packages/shared/src/constants/index.ts`
  - `Currency` enum：`NTD = 'NTD'` → `TWD = 'TWD'`（移除 NTD 成員）。
  - `DEFAULT_CURRENCY = Currency.TWD`。
  - `ZERO_DECIMAL_CURRENCIES = [Currency.TWD, Currency.JPY]`。
  - 新增 `normalizeCurrencyCode(code: string): string`：`'NTD' → 'TWD'`，其餘原樣回傳（Excel 匯入、未來所有寫入入口統一過此函式）。
- `apps/backend/src/services/excelServices.ts`
  - import 處（`:12-14`）沿用；匯入驗證點先 `normalizeCurrencyCode` 再驗證是否屬合法 Currency，舊 `NTD` 視為合法別名。
  - row 預設（`:256`）已用 `DEFAULT_CURRENCY`，自動跟著變 TWD。
- `apps/backend/src/utils/format.ts` 與 `apps/frontend/src/lib/utils.ts`
  - `formatCurrency(val)` → `formatCurrency(val, currency = 'TWD')`，用 `isZeroDecimalCurrency(currency)` 決定 `maximumFractionDigits`（0 或 2），`currency` 傳入 `Intl.NumberFormat`。
  - 此步為 Phase 2 多幣顯示預備，Phase 0 行為（預設 TWD）不變。
- `apps/backend/src/services/openRouterService.ts`：LLM prompt 已輸出 `TWD`（`:84,107`），改名後即一致，無需再動。

**驗收**
- 既有測試全綠；前後端顯示仍為 NT$ 格式。
- 新增測試：含舊 `NTD` 的 Excel 匯入 → `normalizeCurrencyCode` 映射成 `TWD` 成功。

**風險**
- 需全域搜尋確認沒有前端/localStorage/SWR 快取硬寫字串 `'NTD'`（篩選值、預設值）。`grep -rni "NTD" apps/ packages/` 收尾。

---

## Phase 1 — 資料模型一次到位 + 回填（schema 全上線，功能仍單幣、行為 100% 不變）

**目標**：建兩張維度表、四個模型加欄、TransactionExtra 加 base 快照、回填既有資料；聚合改用本位幣欄位但結果與現況逐位相同。**閘門：UI 不開放建立非本位幣帳戶**。

### 1.1 @repo/shared

- `constants/index.ts`：（可選）`SEED_CURRENCIES` 清單供 seeder 與前端共用。
- 新增 `schemas/currency.schema.ts`：
  - `currencySchema = { code, name, symbol, decimalPlaces, isCrypto, isActive }`
  - `exchangeRateSchema = { baseCode, quoteCode, rate, rateDate, source }`
- `types/userTypes.ts`：`UserType` 加 `baseCurrencyCode: string`。
- `types/accountTypes.ts`：`AccountType` 加 `currencyCode: string`。
- `types/transactionTypes.ts`：`TransactionType` 加 `amountInBase: number`、`originalCurrencyCode?: string`、`originalAmount?: number`、`exchangeRate?: number`、`baseRate?: number`。
- `schemas/account.schema.ts`：`createAccountSchema` 加 `currencyCode: z.nativeEnum(Currency).default(Currency.TWD)`。
- `schemas/transaction.schema.ts`：create/update 加 `originalCurrencyCode?`、`originalAmount?`、`exchangeRate?`（皆 optional，後端補齊）。
- `schemas/statistics.schema.ts`：回應 `amount` 由「整數假設」放寬為一般 `number`。

### 1.2 新增表（runtime 模型 `src/models/` + migration `database/migrations/` 兩處都要）

**`src/models/currency.ts` → 表 `accounting.currency`**
| 欄位 | 型別 |
|------|------|
| `code` | `STRING(3)` **PK** |
| `name` | `STRING NOT NULL` |
| `symbol` | `STRING NOT NULL` |
| `decimalPlaces` | `INTEGER NOT NULL DEFAULT 2` |
| `isCrypto` | `BOOLEAN DEFAULT false` |
| `isActive` | `BOOLEAN DEFAULT true` |

Seed：`TWD(0), JPY(0), USD(2), EUR(2), CNY(2), HKD(2), GBP(2)`。

**`src/models/exchangeRate.ts` → 表 `accounting.exchange_rate`**
| 欄位 | 型別 |
|------|------|
| `id` | `UUID PK` |
| `baseCode` | `STRING(3)` FK→currency.code `onDelete RESTRICT` |
| `quoteCode` | `STRING(3)` FK→currency.code `onDelete RESTRICT` |
| `rate` | `DECIMAL(20,10) NOT NULL` |
| `rateDate` | `DATEONLY NOT NULL` |
| `source` | `ENUM('MANUAL','API') DEFAULT 'MANUAL'` |
| `provider` | `STRING NULL` |

唯一索引 `(baseCode, quoteCode, rateDate, source)`。查某日匯率 = 取 `rateDate <= 目標日` 最近一筆。Seed：`TWD→TWD = 1`。

### 1.3 既有模型加欄

- `src/models/account.ts`：`currencyCode STRING(3) NOT NULL DEFAULT 'TWD'` FK→currency.code。
- `src/models/user.ts`：`baseCurrencyCode STRING(3) NOT NULL DEFAULT 'TWD'` FK→currency.code。
- `src/models/transaction.ts`：
  - `amountInBase DECIMAL(20,5) NOT NULL DEFAULT 0`
  - `originalCurrencyCode STRING(3) NULL`
  - `originalAmount DECIMAL(20,5) NULL`
  - `exchangeRate DECIMAL(20,10) NULL`（原幣→帳戶幣別）
  - `baseRate DECIMAL(20,10) NULL`（帳戶幣別→本位幣）
- `src/models/TransactionExtra.ts`：`extraAddInBase DECIMAL(20,5) DEFAULT 0`、`extraMinusInBase DECIMAL(20,5) DEFAULT 0`。
- `src/models/budget.ts`：**移除** `currencyId`；`amount` `DECIMAL(15,2)` → `DECIMAL(20,5)`（與交易精度一致）。同步移除 `BudgetAttributes.currencyId`。

### 1.4 cascade hook 隔離（重要）

`src/models/index.ts` 的 `User.afterDestroy` 串接刪除清單（Transaction/Account/Budget/Category）**不得加入** `Currency` / `ExchangeRate`——它們是共用維度表，刪 User 不可波及。FK 用 `RESTRICT` 再加一層保護。

### 1.5 單一 migration（up/down 對稱，零停機、可逆）

```
up:
 1. createTable currency  → bulkInsert seed
 2. createTable exchange_rate (+唯一索引) → bulkInsert TWD→TWD=1
 3. account.addColumn currencyCode (default 'TWD')
 4. user.addColumn baseCurrencyCode (default 'TWD')
 5. transaction.addColumn amountInBase(nullable) / originalCurrencyCode / originalAmount / exchangeRate / baseRate
    → UPDATE accounting.transaction SET "amountInBase" = "amount"   (既有皆 TWD、本位 TWD)
    → alter amountInBase SET NOT NULL
 6. transaction_extra.addColumn extraAddInBase / extraMinusInBase
    → UPDATE SET extraAddInBase = COALESCE(extraAdd,0), extraMinusInBase = COALESCE(extraMinus,0)
 7. budget.removeColumn currencyId
    → alter budget.amount TYPE DECIMAL(20,5)
down: 反向；budget 重新 addColumn currencyId INTEGER nullable、amount 還原 DECIMAL(15,2)
```

> ⚠️ `.sequelizerc` 指向 `apps/backend/database/`，與 `src/models/` 是**不同目錄**，兩邊都要改。

### 1.6 聚合改寫（`statisticsServices.ts`）

- 原生 SQL 聚合目標由 `amount` → `amountInBase`，`extraMinus/extraAdd` → `extraMinusInBase/extraAddInBase`：
  - `:162`、`:377-383`、`:521-527`、`:596-614`。
- **移除所有 `::integer`**：`:383, :384, :527, :528, :601, :607, :614`（混幣後本位金額可能有小數），回傳一般 `number`；前端用 `isZeroDecimalCurrency(baseCurrency)` 決定顯示精度。
- JS 端 reduce（`:34-47, :264-270, :480-493`）改讀 `amountInBase` 系列欄位。
- 淨值 `Account.sum('balance')`（`:641`）→ 改 `GROUP BY currencyCode` 取各幣小計，service 層用「目前匯率」換算回本位，回傳 `{ byCurrency: [...], totalInBase }`。Phase 1 只有 TWD，結果不變。

**驗收**：以同一份單幣資料，Phase 1 前後所有統計 API 回應逐位相同（零回歸是硬指標）。

---

## Phase 2 — 手動匯率多幣別開燈（純 MANUAL，零外部依賴）

**目標**：解除閘門，開放外幣帳戶與跨幣交易，匯率由使用者手動輸入。

**改動清單**

- **帳戶**：建立/編輯 UI 開放選 `currencyCode`（下拉取 active currency）。
- **新增交易**：當「原幣 != 帳戶幣別」或「帳戶幣別 != 本位幣」時，表單顯示匯率輸入框；後端計算並寫入 `amount / amountInBase / exchangeRate / baseRate` 與 extra 的 base 快照。
- **跨幣轉帳（最高風險，邏輯重寫）**：
  - `createTransfer`（`transactionServices.ts:847`）：目前兩 leg 共用同一 `amount`（`:913,:918`）。改為 from leg = 來源幣金額、to leg = `targetAmount`（目標幣實收額）；各 leg 用各自帳戶的 `baseRate` 算自己的 `amountInBase`；隱含 FX = `outAmount / inAmount`。
  - `updateTransfer`（`:951`）、刪除對向 balance 回滾（`:630, :773` 區段、`calcAccountBalance :275`）：全部改用各 leg 自己的 `amount/rate`，並嚴格測試「編輯/刪除對向同步」避免 balance 不一致。
  - `@repo/shared` `CreateTransferSchema` 加 optional `targetAmount?`、`exchangeRate?`（同幣可省）。
- **LLM 確認流程**：從 `PendingTransaction.transactionData`（JSONB）取 currency → `normalizeCurrencyCode` → 與目標帳戶幣別比對 → 不同則提示補匯率。
- **Excel 匯入外幣**：查 `ExchangeRate` 表回算 `amountInBase`；查無匯率時於匯入報告告警（批次無互動 UI 的 fallback）。
- **淨值 UI**：顯示 `byCurrency` 各幣小計 + `totalInBase` 即時換算。
- **顯示**：交易列/詳情用 `formatCurrency(amount, account.currencyCode)` 顯示原幣，另顯示本位幣換算值。

**風險**
- 跨幣轉帳的編輯/刪除同步是本功能最易出 bug 處，需獨立測試檔覆蓋四種情境（建立/編輯改幣/改額/刪除）。
- 手動匯率漏填或填錯 → `amountInBase` 落庫錯誤快照；需「缺匯率告警」與表單必填驗證。

---

## Phase 3 — API 自動匯率 + 本位幣切換

**目標**：自動匯率與進階呈現。

**改動清單**

- `src/services/exchangeRateService.ts`：接 Frankfurter / exchangerate.host 取匯率，寫入 `exchange_rate`（`source='API'`、`provider` 標來源）；加記憶體/Redis 快取。
- `src/cron/`：新增每日匯率 cron（沿用現有 cron 慣例；`NODE_ENV=test` 或無金鑰時跳過）。
- **交易表單**：匯率欄預設帶 API 建議值（可覆寫，不改已寫入快照）。
- **本位幣切換**：設定頁開放改 `user.baseCurrencyCode`。歷史 `amountInBase` 快照**預設不回溯改寫**（見開放問題）。

**風險 / 待決**
- 本位幣切換後，趨勢圖（`eachMonthNetFlow` 跨期）會出現「過去用舊 base、現在用新 base」單位不一致。處理方式見下方開放問題 Q1。
- service 層跨幣 `SUM` 用 JS `number` 相加有浮點精度風險，需明確 round 策略或引入 decimal 安全運算。

---

## 已拍板的開放問題（2026-06-09 使用者決定）

- **Q1（影響 Phase 3）— 已決：用歷史匯率一次性重算。** 切換本位幣時，用 `ExchangeRate` 歷史把所有歷史交易的 `amountInBase`（含 `baseRate`、`TransactionExtra` 的 base 快照）一次性重算成新本位幣，趨勢圖跨期單位即一致。代價：需 ExchangeRate 完整歷史、會改寫歷史快照、切換為重運算操作（須交易內完成、缺匯率要擋下並告警）。
- **Q2 — 已決：統一 `round(x, 5)`。** 所有 `amountInBase` 等本位幣金額四捨五入到小數 5 位（對齊 `DECIMAL(20,5)`）；跨幣 `SUM` 在 service 層先各自 `round(x,5)` 再相加。
- **交付節奏 — 已決：一口氣做完 Phase 0~3**（使用者指定，覆蓋「一次一個 Phase」預設）。

## 全域風險清單（彙總）

1. 跨幣轉帳是真正的邏輯重寫，非加欄——balance 一致性測試成本最高。
2. `amountInBase` / extra base 快照在匯率未就緒時可能落庫錯誤永久值，需 fallback 與告警。
3. 本位幣切換造成趨勢圖單位不一致（Q1）。
4. JS `number` 跨幣加總浮點精度（Q2）。
5. FK + soft-delete hook 互動：必須確認 Currency/ExchangeRate 不在 User cascade 清單內。
6. crypto 精度不在 MVP 承諾範圍（`isCrypto` 僅旗標預留）。

## 工作量概估

| Phase | 規模 | 重點 |
|-------|------|------|
| Phase 0 | S | 全域改名 + Excel 容錯 + formatCurrency 參數化 |
| Phase 1 | M | 兩表 + 五模型加欄 + 對稱 migration + 回填 + 聚合改寫（零回歸驗證為主要成本） |
| Phase 2 | L | 跨幣轉帳重寫 + 交易表單 + LLM/Excel 整合 + 淨值 UI |
| Phase 3 | M | 匯率 service + cron + 本位幣切換 |
