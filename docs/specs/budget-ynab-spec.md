# 預算系統規格 v2 — YNAB 模式

> **文件狀態**: ✅ 設計定案（B1–B5）；Phase 0 + Phase 1 MVP 完成；**Phase 2 全部完成**（5 項皆做、含信用卡完整重做覆寫 B2，見 §9 P2-D1…D10）。本機全套測試綠（backend 182 / frontend 46），Phase 2 已 commit（518e3db，2026-06-14）
> **最後更新**: 2026-06-14
> **取代**: 舊版 `budget-system-spec.md` 與 `budget-system-tasks.md` 已刪除（git 歷史可查）。舊預算功能將**整個拆除重做**，不做資料遷移。

---

## 給接手 session 的指示

1. **決策 B1–B5 已由使用者拍板（2026-06-10，全採推薦選項，見 §3.1），不可自行更改**；認為有問題先問使用者。
2. **§3.2 的已定案事項不要重新討論**。
3. 依 **Phase 0（拆除）→ Phase 1（MVP）→ Phase 2** 順序進行，完成項目即更新 §9 勾選框。
4. 多幣別約束以 `docs/multicurrency-implementation-plan.md` 為準——特別是 **D5：預算一律本位幣、消耗用 `amountInBase` 累計**（使用者拍板，不可改）。本設計與 D5 完全相容。
5. 遵守 CLAUDE.md 的 GitNexus 流程：編輯任何 symbol 前先 `gitnexus_impact`，commit 前 `gitnexus_detect_changes`。

---

## 0. 核心理念（與舊版的根本差異）

舊版是「多個預算專案、各自設額度、比對花費」；YNAB 是「**單一預算、把真實帳戶裡的錢分配到分類信封**」。

| 面向 | 舊版（已拆除） | YNAB 模式（本設計） |
| --- | --- | --- |
| 預算實體 | 多個 Budget 專案，各有 amount/週期 | **單一預算**，分類即信封（envelope） |
| 額度來源 | 使用者憑空輸入 | **真實 on-budget 帳戶的錢**（起始餘額 + 收入） |
| 週期 | 年/月/週/日自訂 | **固定日曆月** |
| 儲存的狀態 | Budget + BudgetCategory + Snapshot + TransactionBudget | **只有一張分配表** `budget_assignment`，其餘全是推導值 |
| 結轉 | Snapshot 物化 + queue 重算 | Available 跨月遞迴推導，**每次請求全量重算，零失效狀態** |
| 交易耦合 | create/update/delete 都呼叫 `handleBudgetImpact` | **完全解耦**，交易寫入路徑不含任何預算邏輯 |

---

## 1. Glossary

| 術語 | 說明 |
| --- | --- |
| **Envelope（信封）** | 一個支出分類的預算容器。本設計掛在支出 Main 分類層（B1） |
| **Assigned** | 某月分配給某信封的金額，唯一由使用者輸入並儲存的預算資料。可為負（搬錢修正） |
| **Activity** | 該月該信封的交易淨額（支出為負），用 `amountInBase` 累計，**即時推導不儲存** |
| **Available** | `max(0, 上月 Available) + Assigned + Activity`，跨月遞迴推導 |
| **RTA（Ready to Assign）** | 還沒分配給信封的錢。流水推導：起始部位 + 累計收入 − 累計已分配 − 前月 cash overspending |
| **On-budget 帳戶** | 參與預算的帳戶（現金/銀行/信用卡）。其收入進 RTA、支出計 Activity |
| **Tracking 帳戶** | 不參與預算的帳戶（證券戶等），只進淨值 |
| **Move Money** | 信封之間（或與 RTA 之間）搬 Assigned |
| **Cash overspending** | 信封 Available 為負（現金已花掉）→ 月底歸零並從下月 RTA 扣除 |
| **startMonth** | 預算起始月。之前的歷史交易不參與預算 |

---

## 2. YNAB 機制與採用範圍

（YNAB 行為已對照官方文件查證，2026-06）

| # | 機制 | YNAB 優先級 | 本專案 |
| --- | --- | --- | --- |
| 1 | 單一預算 + RTA 來自真實帳戶 + zero-based 恆等式 | 核心 | **Phase 1** |
| 2 | Assigned per (category, month)、Available 跨月結轉 | 核心 | **Phase 1** |
| 3 | Assigned / Activity / Available 三數字推導 | 核心 | **Phase 1** |
| 4 | Cash overspending：負 Available 歸零 + 扣下月 RTA | 核心 | **Phase 1** |
| 5 | On-budget vs Tracking + 轉帳邊界規則 | 核心 | **Phase 1** |
| 6 | Move Money / Cover Overspending | 核心 | **Phase 1** |
| 7 | 收入進 RTA、不分月 | 核心 | **Phase 1**（規則式，B3） |
| 8 | 未來月份預先分配（即時扣全域 RTA） | 重要 | Phase 2（複用 `budget_assignment`，無 schema 變更） |
| 9 | Credit overspending 與 cash 區分 | 重要 | Phase 2 |
| 10 | Credit Card Payment category 自動搬錢 | 重要 | Phase 2（Phase 1 信用卡採現金式，B2） |
| 11 | Targets（Set Aside / Refill / Balance by Date）+ Underfunded | 重要 | Phase 2（`budget_target` 表已預留設計 §4.5） |
| 12 | Auto-Assign 快速按鈕（Underfunded / Assigned Last Month） | 重要→可略 | Phase 2 |
| 13 | Weekly cadence target、snooze、還款 target | 可略 | 不做 |
| 14 | Age of Money | 可略 | 不做 |
| 15 | 預算專屬報表 | 可略 | 不做（既有 dashboard 足夠） |

**Phase 2 機制備忘**（屆時不必重新研究）：

- **信用卡完整機制**：每張卡自動產生 `Credit Card Payment` category；刷卡時 `covered = min(金額, 信封 Available 正值)` 自動搬到 CC Payment（推導值，非寫入）；還卡費 = 銀行→卡轉帳，扣 CC Payment 的 Available；未覆蓋部分 = credit overspending，月底歸零但**不扣 RTA**（留在卡債）。
- **Targets 計算**：`Set Aside Another X` → Underfunded = `max(0, X − Assigned)`；`Refill Up To X` → `max(0, X − carryIn − Assigned)`；`Balance of X by date` → 剩餘缺口 ÷ 剩餘月數攤提。Target 只產生提示，不自動動錢。

---

## 3. 設計決策

### 3.1 使用者已拍板（B1–B5，2026-06-10，不可自行更改）

| # | 決策 | 拍板結論 | 理由 |
| --- | --- | --- | --- |
| B1 | **Envelope 掛哪一層** | **(a) Main 層**、Sub 自動 roll-up（約 11+ 個信封） | YNAB 實務粒度即 10–20 個；Sub 層 60+ 列逐月分配太繁瑣，且要處理交易直接掛 Main 的幽靈信封 |
| B2 | **信用卡 MVP 處理** | **(a) on-budget 現金式**：刷卡即扣信封、還款零影響、起始卡債扣 RTA | pay-in-full 心智模型；當 tracking 會讓信用卡消費完全進不了預算 |
| B3 | **收入怎麼進 RTA** | **(a) 規則式**：on-budget 帳戶所有收入（`type=收入` 且 `linkId IS NULL`）一律進 RTA | 零 schema 變更、零遷移、不改記帳習慣；特殊分類會汙染統計頁 |
| B4 | **預算起始月語意** | **(a) 啟用時選 startMonth**（預設當月），之前交易不參與 | 全歷史參與會要求補分配多年歷史 |
| B5 | **跨邊界轉帳的分類（MVP）** | **(a) 系統虛擬列「轉出（未分類）」** | 零 schema 變更，Phase 2 再加選填分類 |

### 3.2 已定案（不重新討論）

| 決策 | 內容 | 理由 |
| --- | --- | --- |
| **RTA 採流水推導，放棄與帳戶現值對帳** | RTA 完全由 `amountInBase` 流水推導，恆等式 `起始部位 + Σ流入 = RTA + Σ Available` 由構造保證成立。外幣帳戶的匯率漂移不進預算（淨值功能已涵蓋現值） | D5 已定 Activity 用 `amountInBase` 固定快照值，強行對帳現值只能引入使用者無法理解的「FX 調整項」。外幣帳戶一律 tracking 則等於閹割剛做完的多幣別 |
| **計算採每次請求全量推導，無快照** | 唯一儲存狀態 = `budget_assignment`。2 條聚合 SQL + JS fold；回溯補帳/改交易/刪除/切本位幣**自動正確** | 個人應用幾萬筆交易在 PG 聚合是毫秒級；舊版 Snapshot + `isRecalculating` + queue 被認定過度設計 |
| **本位幣切換時 `assigned` 用該月 1 號歷史匯率換算，缺匯率整批中止** | 整合進 `baseCurrencyService.changeCurrency`，取代舊預算換匯區塊 | Activity 被逐筆按交易日歷史匯率重算，assigned 用同月歷史匯率才不會讓過去月份出現假超支（會串扣後續 RTA） |
| **startRTA 動態推導，不落庫** | `帳戶起始日餘額 = 現在 balance − Σ(起始日後交易的有號影響)`，再乘起始日匯率 | 回溯補帳（含補在起始日前）與本位幣切換自動一致 |
| **轉帳判定用 `linkId IS NOT NULL`** | 兩端皆 on-budget → 零影響；on-budget→tracking 的 from leg → 視同支出；tracking→on-budget 的 to leg → 視同 RTA 流入 | codebase 中轉帳 = 兩筆互指 `linkId` 的交易（from leg `type=支出`、to leg `type=收入`），`linkId` 是唯一可靠依據 |
| **Activity 用 `date` 不用 `billingDate`** | 月份歸屬依交易日期 | 與 YNAB 一致 |
| **分類被刪時 assignment CASCADE，RTA 自動回升** | — | 推導式架構的自然結果 |
| **舊 4 表直接 drop，不轉換資料** | — | 使用者已定案取代重做 |

---

## 4. 資料模型

### 4.1 新表 `budget_assignment`（唯一儲存的預算狀態）

| 欄位 | 型別 | 約束 | 說明 |
| --- | --- | --- | --- |
| `id` | UUID | PK, default UUIDV4 | |
| `userId` | UUID | NOT NULL, FK→`user.id` | `User.afterDestroy` hook 串接清理（沿用既有模式） |
| `categoryId` | UUID | NOT NULL, FK→`category.id`, ON DELETE CASCADE | 限支出 Main 層（service 層驗證 parent 為 Root 支出） |
| `month` | DATEONLY | NOT NULL | 該月 1 號（如 `2026-06-01`） |
| `assigned` | DECIMAL(20,5) | NOT NULL, default 0 | 本位幣（D5）。可為負 |
| `createdAt` / `updatedAt` | DATE | NOT NULL | **`paranoid: false`**（soft-delete 殘留列會撞 unique 約束；assigned=0 即等同不存在，永不刪列） |

- `UNIQUE(userId, categoryId, month)`（upsert 錨點）
- `INDEX(userId, month)`

### 4.2 既有表加欄

| 表 | 欄位 | 型別 | 說明 |
| --- | --- | --- | --- |
| `account` | `onBudget` | BOOLEAN NOT NULL DEFAULT true | migration 回填：現金/銀行/信用卡→true，證券戶/其他→false。歸檔帳戶不影響此語意 |
| `user` | `budgetStartMonth` | DATEONLY NULL | null = 未啟用預算（沿用 `baseCurrencyCode` 直接加在 user 的慣例） |

### 4.3 補索引

| 表 | 索引 | 理由 |
| --- | --- | --- |
| `transaction` | `INDEX(userId, date)` | activity 聚合主查詢路徑，目前缺 |

### 4.4 刪除的表（Phase 0）

`budget`、`budget_category`、`transaction_budget`、`budget_period_snapshot` 四表，一支 migration drop（down 重建空表結構維持可逆）。原建表 migration：`20260119133000-create-budget-system.js`。

### 4.5 Phase 2 預留：`budget_target`（本次不建表）

`id`, `userId`, `categoryId UNIQUE`, `type ENUM('SET_ASIDE','REFILL','BALANCE_BY_DATE')`, `amount DECIMAL(20,5)`, `dueDate DATEONLY NULL`, timestamps。Underfunded 為推導值不落庫。

---

## 5. 計算邏輯

### 5.1 恆等式（寫成測試的不變量）

1. **資金守恆**：`startRTA + Σ累計流入(Base) + Σ累計 Activity(Base) = RTA + Σ Available（歸零前）` —— 任意月份、由構造恆成立。（Activity 支出為負，故移項後等價於「進來的錢 = 已花費 + 信封結餘 + 未分配」。⚠️ 原稿漏列 `Σ Activity` 項，字面不成立；測試須以此修正式撰寫，且兩側取自獨立來源——左側用輸入與 Activity、右側獨立加總 `rows[].available`——否則會退化成套套邏輯。）
2. `Available(c,m) = max(0, Available(c,m−1)) + Assigned(c,m) + Activity(c,m)`，全鏈可從 startMonth 重放交易重建。
3. 上月 cash overspending 總和 = 本月 RTA 的扣減量。
4. on-budget 內部轉帳對所有預算數字零影響。
5. 編輯/刪除/改日期/改分類/改帳戶 `onBudget` 任一操作後，結果與「從頭重放」一致（全推導架構天然滿足，仍須測試覆蓋）。
6. 本位幣切換後：assigned 按該月歷史匯率換算、Activity 隨 `amountInBase` 重算，恆等式仍成立。

### 5.2 月份視圖（虛擬碼）

```
# ============ getMonthView(userId, targetMonth) ============
start = user.budgetStartMonth                  # 必須非 null
assert start <= targetMonth <= currentMonth    # MVP 不開放未來月

# --- (1) startRTA：動態推導，不落庫 ---
startRTA = 0
for acc in accounts where onBudget:            # 含 isArchived
  # 有號影響 = 收入 leg：+(amount + extraAdd − extraMinus)
  #            支出 leg：−(amount + extraMinus − extraAdd)   （帳戶幣別，= calcAccountBalance 的逆運算）
  deltaSince = SQL_SUM(signedEffect of txns: accountId=acc, date >= start)
  balanceAtStart = acc.balance − deltaSince
  startRTA += roundToBase(balanceAtStart × getRate(acc.currencyCode, base, start))
  # 缺匯率 → 整批拋錯要求補匯率（沿用 changeBaseCurrency 語意）

# --- (2) Activity：一條聚合 SQL，roll-up 到 Main ---
# 範圍：on-budget 帳戶、date ∈ [start, targetMonth 月末]、支出側、amountInBase
# 含一般支出（linkId IS NULL AND type='支出'）
# 含跨邊界轉出 from leg（linkId NOT NULL AND 對端帳戶 onBudget=false）→ 歸入虛擬列 UNCLASSIFIED_OUT
# 排除 on-budget 內部轉帳
SELECT date_trunc('month', t.date)                        AS month,
       CASE WHEN t."linkId" IS NOT NULL THEN 'UNCLASSIFIED_OUT'
            WHEN p."parentId" IS NULL   THEN c.id          -- 交易掛 Main
            ELSE c."parentId" END                          AS mainCategoryId,
       SUM(t."amountInBase"
           + COALESCE(e."extraMinusInBase",0) − COALESCE(e."extraAddInBase",0)) AS outflow
...GROUP BY 1, 2
# activity[c][m] = −outflow

# --- (3) Inflow：一條聚合 SQL，by month ---
# 一般收入（linkId IS NULL AND type='收入'，on-budget 帳戶）
# + tracking→on-budget 轉入 to leg
inflow[m] = SUM(amountInBase + extraAddInBase − extraMinusInBase)

# --- (4) 純函式 fold（logic/budgetLogic.ts 重寫，可無 DB 單元測試）---
envelopes = 支出 Main 分類（全域 + 自建）∪ {UNCLASSIFIED_OUT}
carry = {c: 0}; cumAssigned = 0; cumInflow = 0; priorOverspend = 0
for m in start .. targetMonth:
  for c in envelopes:
    available[c] = max(0, carry[c]) + assigned[c][m] + activity[c][m]
  if m < targetMonth:
    priorOverspend += Σ_c min(0, available[c])   # cash overspending 扣下月 RTA
    carry = available
  cumAssigned += Σ_c assigned[c][m]
  cumInflow   += inflow[m]

RTA = startRTA + cumInflow − cumAssigned + priorOverspend
```

### 5.3 寫入操作

```
# assign(userId, month, categoryId, amount)
驗證 categoryId 為支出 Main 層 → UPSERT budget_assignment SET assigned = amount（絕對值）

# moveMoney(userId, month, from?, to?, amount)    # from/to 任一為 null = RTA
DB transaction { from 非 null → assigned −= amount；to 非 null → assigned += amount }

# changeBaseCurrency 整合（取代舊預算換匯區塊）
for row in budget_assignment where userId:
  row.assigned ×= getRate(oldBase, newBase, row.month 的 1 號)   # 缺匯率 → 整批中止
```

---

## 6. API 設計

單一預算，故無 `/budgets/:id`。對齊既有 `/api` + `authMiddleware` 風格；schema 放 `@repo/shared`（新增 `budget.schema.ts`）。

| Method | Path | 用途 |
| --- | --- | --- |
| GET | `/api/budget` | 預算狀態 `{ enabled, startMonth, baseCurrencyCode }` |
| POST | `/api/budget/init` | 啟用 `{ startMonth, accountOverrides?: [{accountId, onBudget}] }` |
| PUT | `/api/budget/settings` | 改 startMonth（全推導架構下改完自動正確） |
| GET | `/api/budget/months/:month` | 月份視圖一次回傳全部（shape 見下） |
| PUT | `/api/budget/months/:month/assignments/:categoryId` | `{ assigned }` 絕對值 upsert |
| POST | `/api/budget/months/:month/move` | `{ fromCategoryId\|null, toCategoryId\|null, amount }`，原子搬錢 |
| PUT | `/api/accounts/:id`（既有） | account schema 加 `onBudget` 欄位即可 |

`GET /months/:month` 回應：

```ts
{
  month: '2026-06', startMonth: '2026-01', readyToAssign: number,
  rtaBreakdown: { startingBalance, cumulativeInflow, cumulativeAssigned, priorOverspending },
  rows: [{ categoryId, name, icon, color, assigned, activity, available, isOverspent }],
  unclassifiedTransferOut: { activity, available } | null,   // 虛擬列，無流出時為 null
  totals: { assigned, activity, available }
}
```

---

## 7. 前端頁面結構

`app/(main)/budget`（單數，取代舊 `budgets`），SWR key `/budget/months/${month}`：

- `page.tsx` — 未啟用時渲染 `InitBudgetDialog`（選 startMonth + 帳戶 onBudget 核對清單）
- `BudgetMonthNav` — 月份切換（start..當月）
- `ReadyToAssignCard` — RTA 大數字，負值紅色；Popover 顯示 rtaBreakdown
- `BudgetTable` — Main 信封列表（含「轉出（未分類）」虛擬列）；欄：分類 / Assigned / Activity / Available
  - `AssignedCell` — 行內編輯 Input，blur/Enter 送 PUT，optimistic mutate
  - `AvailablePill` — Badge：正=綠、零=灰、負=紅
  - `MoveMoneyPopover` — 點 Available 開啟：金額 + 目的地（含 RTA），RHF + Zod
- `CategoryActivitySheet` — 點 Activity 開 Sheet，用既有 transactions API 按分類+月份列交易
- `OverspendingBanner` — 本月有負 Available 時提示「月底將自下月 RTA 扣除」

---

## 8. Phase 0：舊系統拆除清單

（盤點於 2026-06-10，共 26 個純 budget 檔案 + 7 個混合檔案 + 4 張表）

### 8.1 整檔刪除 — 後端

- `apps/backend/src/models/budget.ts`、`budgetCategory.ts`、`budgetPeriodSnapshot.ts`、`transactionBudget.ts`
- `apps/backend/src/services/budgetService.ts`
- `apps/backend/src/logic/budgetLogic.ts`（Phase 1 重寫同名檔）
- `apps/backend/src/controllers/budgetController.ts`、`budgetCategoryController.ts`
- `apps/backend/src/routes/budgetRoute.ts`
- `apps/backend/database/seeders/20260119134500-demo-budget.js`
- `apps/backend/tests/unit/budget_controller.test.ts`、`budget_service.test.ts`、`budget_impact.test.ts`

### 8.2 整檔刪除 — 前端

- `apps/frontend/src/types/budget.ts`、`lib/budget-utils.ts`、`services/budget.ts`
- `apps/frontend/src/components/budgets/`（全部 7 個元件）
- `apps/frontend/src/components/dashboard/BudgetWidget.tsx`
- `apps/frontend/src/app/(main)/budgets/`（兩頁）

### 8.3 混合檔案局部修改

| 檔案 | 修改內容 |
| --- | --- |
| `apps/backend/src/models/index.ts` | 移除 Budget 系列 import、所有關聯定義、`User.afterDestroy` 的 `Budget.destroy` 區塊（⚠️ 訪客清理 cron 依賴此 hook，Phase 1 換成 `BudgetAssignment.destroy`） |
| `apps/backend/src/services/transactionServices.ts` | 移除 `TransactionBudget` / `handleBudgetImpact` import、create/update/delete 三處呼叫點、`budgetIds` 參數處理 |
| `apps/backend/src/services/baseCurrencyService.ts` | 移除預算換匯區塊與 `budgetsConverted` 回傳（Phase 1 改為換算 `budget_assignment`） |
| `apps/backend/src/app.ts` | 移除 `budgetRoute` import 與掛載 |
| `apps/frontend/src/components/layout/sidebar.tsx` | 刪除已註解的 `/budgets` 導覽項 |
| `apps/frontend/src/components/transactions/transactionSheet.tsx` | 刪除已註解的 budget 相關程式碼（state / useEffect / budgetIds） |
| `apps/frontend/src/services/authService.ts` | 移除 `budgetsConverted` 回傳型別欄位 |
| dashboard 組合處 | 移除 `BudgetWidget` 引用 |

### 8.4 Migration

新增一支 drop migration（drop 4 表；down 重建空表結構）。

---

## 9. 進度追蹤

### Phase 0 — 拆除舊系統 ✅（2026-06-10 完成）

- [x] 後端純 budget 檔案刪除（§8.1）
- [x] 前端純 budget 檔案刪除（§8.2）
- [x] 混合檔案局部修改（§8.3；實際範圍比盤點多了 9 個混合測試檔的 budget mock 清理 + `@repo/shared` `transaction.schema.ts` 三處 `budgetIds` 欄位移除 + `baseCurrencySwitch.test.ts` 預算斷言移除）
- [x] drop migration（§8.4，`20260610120000-drop-budget-system.js`）+ up/down/up 可逆性驗證通過
- [x] 型別檢查（backend/frontend/shared 無新增錯誤）+ 後端 138 測試全綠（原 158，−20 為刪除的 budget 測試）+ 前端 29 全綠

### Phase 1 — YNAB MVP ✅（2026-06-11 完成）

- [x] migration：`budget_assignment` 表 + `account.onBudget` + `user.budgetStartMonth` + `transaction(userId, date)` 索引（`20260611000000-create-budget-phase1.js`，up/down/up 可逆性驗證通過；down 的索引刪除須用 schema 限定 raw SQL——`removeIndex` 在 accounting schema 下會靜默跳過）
- [x] runtime 模型（`src/models/budgetAssignment.ts` 含唯一索引宣告 + index.ts 關聯 + `User.afterDestroy` 清理 + `Category.afterDestroy` 硬刪 assignment + 串接 soft-delete 子分類——分類已於 review 後改為 soft-delete，見下方「Code review 修正」）
- [x] `@repo/shared`：`budget.schema.ts`（月份格式強制 `YYYY-MM-01`；params schemas 含 categoryId uuid 驗證）
- [x] `logic/budgetLogic.ts` 重寫：純函式 fold（12 個單元測試覆蓋恆等式 1–3、UNCLASSIFIED 沖銷、結轉、負 assigned）
- [x] `budgetService` 重寫：startRTA 推導 + 兩條聚合 SQL + getMonthView / assign / moveMoney / init（assign/move 驗證月份在 [start, 當月]；聚合 SQL 的 CASE 須 `::text`——uuid 欄位混文字常數會被 PG 推斷成 uuid 而炸）
- [x] `baseCurrencyService` 整合：assigned 按該月 1 號歷史匯率換算（plans 模式，缺匯率整批中止）
- [x] routes / controllers + `validate` middleware（body + params 雙重驗證）
- [x] 前端 `app/(main)/budget` 全套（§7，SWR + optimistic mutate + CategoryActivitySheet 客端 Main roll-up）+ sidebar 導覽
- [x] 測試：後端單元 12 + 整合 6（startRTA 回推、三種轉帳邊界、Sub roll-up、跨月沖銷、分類刪除、本位幣切換含缺匯率中止）+ 前端元件 9

**實作補充決策**（Phase 1 落地時定，未動 B1–B5）：

- **已刪帳戶視同 YNAB closed account**：帳戶 soft-delete 後交易仍保留（codebase 既有慣例，統計頁同此），startRTA 與聚合 SQL 一致地包含其歷史，預算數字不漂移。
- **已刪分類若仍有 activity/assigned，信封保留並標註「（已刪除）」**：歷史支出維持沖銷（負 available 計入 overspending），否則已花掉的錢會從預算憑空消失；assignment 本身由 `Category.afterDestroy` 硬刪，RTA 回升。
- **新帳戶 `onBudget` 未指定時由後端依類型預設**（現金/銀行/信用卡→true，其餘→false，同 migration 回填語意）；schema 改 optional，避免前端表單恆送 true。
- **已知邊角（Phase 2 候選）**：on-budget 內部轉帳帶手續費（from leg extraMinus）整腿被排除，手續費不進任何信封——屬流水推導已接受的漂移，金額極小；若要精確可在 Phase 2 把內部轉帳的 extra 計入 activity。

**Code review 修正（2026-06-13，多代理 review 後）**：

- **[H] 本位幣切換漏算已刪帳戶交易**：`baseCurrencyService` 重算交易時 `include` Account 未帶 `paranoid:false`，已刪外幣帳戶的交易幣別 fallback 成舊本位幣 → activity 失真假超支串扣 RTA（違反恆等式 6）。已加 `paranoid:false`。
- **[H] 分類刪除資料遺失 + 信封保留死碼**：原 `Category` 實為**硬刪**（`paranoid:false`）且 `transaction.categoryId` FK 為 `ON DELETE CASCADE`——刪有交易的分類會連帶物理刪除其交易，且本節「保留已刪分類信封」的承諾為不可達死碼。**已將 `Category` 改為 soft-delete**（migration `20260613000000-category-soft-delete.js` 加 `deletedAt`），DB CASCADE 不再觸發、交易保留、orphan 信封標註「（已刪除）」生效；子分類連帶刪除改由 `Category.afterDestroy` hook 串接 soft-delete。
- **[M] startMonth 不可為未來**：`init`/`updateSettings` 補驗證，否則預算頁永久卡載入。
- **[M] controller 業務錯誤回 4xx**：`budgetController` 統一以 400 + responseHelper 回業務錯誤（沿用 `changeBaseCurrency` 語意），缺匯率等提示才到得了前端。
- **[M] 當月以伺服器為準**：`GET /budget` 回傳 `currentMonth`，前端 clamp 上界與預設選月改用之，消除月初瀏覽器/伺服器時區落差。
- **[M] 前端**：OverspendingBanner 納入虛擬列負 available；assign optimistic mutate 回寫樂觀視圖避免閃值；CategoryActivitySheet 過濾 off-budget 帳戶並計入 extra 欄位。
- **[L] 其他**：`assign` 改原子 upsert；測試補恆等式 1 真守恆、恆等式 5 回放、moveMoney 失敗路徑、onBudget true 分支、MoveMoneyPopover/InitBudgetDialog；整合測試改假時鐘（移除 `skipIf` 時間耦合）+ 切換當日誘餌匯率；本節恆等式 1 公式補回 `Σ Activity` 項（§5.1）。

### Phase 2 — 設計定案（2026-06-14，scope 已拍板：全 5 項，含信用卡完整重做）

> 使用者於 2026-06-14 拍板本輪做滿 5 項並**重做信用卡為完整 CC Payment 機制（取代 B2 現金式）**。以下 P2-D1…D10 為承接設計（部分由 design workflow 的 correctness-first 設計案壓力測試後，依 spec §3.2 架構哲學調整）。

| # | 決策 | 定案 |
| --- | --- | --- |
| **P2-D1** | CC Payment 儲存表示 | 擴充 `budget_assignment` 加 nullable `creditAccountId` 判別欄（**非新表、非真分類**，維持單一儲存表、不污染分類樹/統計頁，符合 B3）。`categoryId` 改 nullable；CHECK「`categoryId`/`creditAccountId` 恰一非空」；兩個 **partial unique index**（envelope：`(userId,categoryId,month) WHERE creditAccountId IS NULL`；ccpay：`(userId,creditAccountId,month) WHERE creditAccountId IS NOT NULL`）。CC Payment 信封在 fold/回應用虛擬 id `__CCPAY__:<accountId>`（不落庫，比照 `UNCLASSIFIED_OUT`）。清理：`account` 為 soft-delete → 新增 `Account.afterDestroy` hook 硬刪該卡 assignment（比照 `Category.afterDestroy`）。 |
| **P2-D2** | covered 演算法 | **採聚合公式，不採逐筆事件重放**。design workflow 的 Angle B 主張逐筆最 YNAB-exact，但牴觸 §3.2 已定案的「2 條聚合 SQL + JS fold」哲學（逐筆/物化被判過度設計）、blast radius 最大。每 (envelope, month)：現金/銀行支出先消耗 funded（`max(0,carryIn)+assigned`），餘額再依卡別 cover 刷卡：`covered[card]=min(creditSpend[card], 餘額)` 移入該卡 CC Payment。**已接受漂移**：同月多筆刷卡 + 期中分配/退款的順序相依情形與 YNAB 微小差異（比照 Phase 1 內部轉帳手續費漂移），Phase 2+ 可改逐筆。 |
| **P2-D3** | 信用卡退出 RTA | startRTA 與 inflow 一律排除 `type=信用卡` 帳戶（YNAB：負債帳戶不貢獻 RTA；卡債由 CC Payment 負 available 追蹤）。**覆寫 B2 的關鍵行為改變**：Phase 1 起始卡債在 startRTA 壓低 RTA，Phase 2 移到 carryCC。全推導無快照可遷移——翻 SQL 排除 + seed carryCC 自動一致。⚠️ 既有有卡債者部署後 RTA 會跳升 + 出現卡債列（需 release note）。 |
| **P2-D4** | 起始卡債 | `ccStartDebt[card]` 比照 startRTA 推導卡的起始日餘額（負），CC Payment carryCC 初值 = 該負值。不扣 RTA、不建 target；須分配真錢到 CC Payment 並還款清償（YNAB startup debt，守恆）。 |
| **P2-D5** | 還款偵測（結構式） | 轉帳 from-leg=EXPENSE 於 on-budget 非信用卡帳戶、`targetAccountId` 指向 on-budget 信用卡 → REPAY，扣該卡 CC Payment available（取代 Phase 1「on-budget 內部轉帳零影響」）。純依帳戶型別，不看分類名。 |
| **P2-D6** | 現金 vs 信用超支 | 信封負 available 月底歸零時：現金超支扣下月 RTA（同 Phase 1）；信用超支（未 cover 的刷卡）**不扣 RTA**、留為卡債。混合月「信用超支 = Σ未cover刷卡」切分、其餘為現金超支。 |
| **P2-D7** | 退款回補信封 | `type=收入` 且 categoryId roll-up 到**支出 root** = 退款 → 該信封正 activity，且排除於 RTA inflow。零 schema。 |
| **P2-D8** | 跨邊界轉帳選填分類 | 轉出 from-leg 的 categoryId 若 roll-up 到支出 root 即歸該信封、否則落 `UNCLASSIFIED_OUT`。複用既有交易編輯設定分類，零 schema。 |
| **P2-D9** | 未來月份預先分配 | 放寬 `assertMonthInRange`/view 上界至 `當月 + BUDGET_MAX_FUTURE_MONTHS(=12)`；fold 對 target>當月 天然正確（未來無收入，RTA 由當月結轉再扣未來 assigned）。前端 nav 開放未來導覽 + 「未來」徽章。 |
| **P2-D10** | Targets | 新增 `budget_target` 表（§4.5）；Underfunded 純推導（公式見 §2 備忘）；Auto-Assign 兩鈕（Underfunded / Assigned Last Month）。 |

回應 shape 擴充：`BudgetMonthView` 加 `creditCardPayments: CreditCardPaymentRow[]` 與 `creditOverspending` 提示欄；envelope row 加 `overspendKind`；totals 納入 CC Payment；`moveMoney` 端點泛化以接受 CC Payment 為來源/目的地。

**建置順序**（增量交付、逐項驗證、完成即勾選）：① 未來月份 → ② 退款 + 跨邊界分類（純 SQL/logic）→ ③ schema + Targets → ④ 信用卡完整機制（最大、fold 核心改寫，最後做）。

### Phase 2 — 進度

- [x] **① 未來月份預先分配（P2-D9）**（2026-06-14）：`BUDGET_MAX_FUTURE_MONTHS` 共用常數；`budgetService` 放寬 `assertMonthInRange` 上界 + `addMonths`/`maxBudgetMonth`；前端 `BudgetMonthNav` 開放未來 + 「未來」徽章、`page.tsx` clamp 至 maxMonth。測試：整合 +1（未來月分配即時扣該月 RTA）、範圍驗證改超界、前端 nav +1。後端整合 11 綠 + 前端 14 綠 + 型別零新錯。
- [x] **② 退款回補信封（P2-D7）+ 跨邊界轉帳選填分類（P2-D8）**（2026-06-14）：activity SQL 改帶號 SUM（支出負/退款收入正）+ 納入「收入掛支出 root」退款列；CASE 轉出依 from-leg root 歸信封或虛擬列（加 grandparent join 取 root type）；inflow SQL 排除退款列。零 schema。測試：整合 +3（退款不進 RTA、未分類轉出反例、含退款守恆）+ 既有 5/6 月斷言更新為已分類轉出語意 + fixture 真實收入改掛收入分類。整合 14 綠。⚠️ **行為備忘**：P2-D7 把「`type=收入` 且分類 root 為支出」一律視為退款（不進 RTA、回補信封）——使用者若把真實收入誤掛支出分類會被重判（YNAB 同此語意；正常收入應掛收入分類）。
- [x] **③ `budget_target` + Underfunded + Auto-Assign（P2-D10）**（2026-06-14）：migration `20260614000000-create-budget-target.js`（up/down/up 通過；down 另 DROP ENUM 型別避免撞名）+ `BudgetTarget` 模型 + User/Category afterDestroy 清理；shared `upsertTargetSchema`/`autoAssignSchema`/`BudgetTargetInfo` + row 加 `target`/`underfunded`；`budgetLogic.computeUnderfunded`（SET_ASIDE/REFILL/BALANCE_BY_DATE 三式 + `monthDiff`）；service `upsertTarget`/`deleteTarget`/`autoAssign`（UNDERFUNDED 補缺口 / LAST_MONTH 沿用上月）；controller/routes（PUT/DELETE `/budget/categories/:categoryId/target`、POST `/budget/months/:month/auto-assign`）；前端 `TargetPopover` + 缺口快速補足 chip + Auto-Assign 兩鈕。測試：後端整合 +4、單元 +7、前端 +1。整合 18 綠 + 單元 18 綠 + 前端 15 綠。
- [x] **④ 信用卡完整機制（P2-D1～D6）**（2026-06-14）：
  - migration `20260614010000-budget-credit-card.js`（`budget_assignment` 加 `creditAccountId` + categoryId 改 nullable + 兩 partial unique idx + CHECK；up/down/up 通過）。
  - 模型：`budgetAssignment` 加 `creditAccountId`/categoryId nullable；`Account.afterDestroy` hook 硬刪該卡 CC Payment assignment。
  - shared：`CreditCardPaymentRow`、`BudgetMonthView.creditCardPayments`/`creditOverspending`、`BudgetEnvelopeRow.overspendKind`、`moveMoney` 加 cc 端點、`monthCreditParamsSchema`。
  - **fold 改寫**（聚合公式，向後相容：無卡時退化為原行為）：`availEnv = funded + envActivity`；`creditOverspend = min(TC, max(0,−availEnv))`、`cashOverspend = 餘`、`covered = TC − creditOverspend`（貪婪分配到各卡）；CC Payment available = carryCC(起始卡債) + assignedCC + Σcovered − repay；只有 cashOverspend 扣 RTA。
  - service：`computeStartPositions`（startRTA 排除信用卡 + ccStartCarry + cards）；card-spend / repay 聚合 SQL；inflow 排除信用卡；assignments 拆 envelope/cc；`ccAssign`；`moveMoney` 泛化（端點可為分類/CC Payment/RTA）。
  - controller/routes：`PUT /budget/months/:month/cc-assignments/:accountId`；moveMoney 接 cc 欄位。
  - 前端：`CreditCardPaymentSection`（撥備 cell + 可付 pill + 卡債標籤）；`OverspendingBanner` 現金/信用分流；page 接線。
  - 測試：單元 +5（covered、信用超支不扣 RTA、起始卡債、mixed、還款）、整合 +3（刷卡 covered、還款、cc-assign）、前端 +2。**後端全套 182 綠、前端全套 46 綠、型別零新錯**。
  - ⚠️ **覆寫 B2（部署 release note）**：信用卡帳戶退出 RTA、起始卡債移至 CC Payment carry——既有有卡債者部署後 RTA 會跳升 + 出現 CC Payment 卡債列。**已接受漂移**：covered 採聚合（同月多筆刷卡+期中分配/退款的順序相依與 YNAB 微差）；退款入信用卡僅回補信封、未自動降 CC Payment；信用卡跨邊界轉出未計入 cardSpend（視同現金式超支）。
  - hookTimeout/testTimeout 放寬至 60s（budget 整合 fixture 增至 4 組，雲端延遲變異偶致重型 beforeAll 逾時）。

**Phase 2 全部完成（2026-06-14）。** 後端整合 21 + 單元 23、前端 17（budget 子套件），全套 backend 182 / frontend 46 綠。Phase 2 已 commit（518e3db，2026-06-14）。

---

## 10. 參考來源

YNAB 機制查證（2026-06）：官方支援文件 Overspending guide、Month rollover guide、Credit card overspending、Ready to Assign negative、Targets guide、Auto-Assign guide、Assigning future income、Age of Money。
