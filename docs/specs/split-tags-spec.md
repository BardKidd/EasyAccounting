# 拆分交易 + 標籤 規格 — Split Transaction & Tags

> **文件狀態**: 🟢 **Phase A（Tags）已 commit；Phase B（Split）完成（2026-06-15）**。決策 S1–S9 已拍板。
> **最後更新**: 2026-06-15
> **部署備忘**: migrations `20260614020000-create-tags`、`20260615000000-create-transaction-split`、`20260615010000-create-transaction-split-unit-view` 已套用本機 dev DB；**部署需於 Railway 依序跑 migration**（release note）。本機測試綠：backend 198（+8 splitFlow）／frontend 53（+4 splitEditor）。
> **對應 Roadmap**: `todo.md` Tier 1 #2「拆分交易 + 標籤 (Split Transaction + Tags) — Priority High」
> **相依規格**: 預算 `budget-ynab-spec.md`（D5：預算一律本位幣、消耗用 `amountInBase`）、多幣別 `multicurrency-implementation-plan.md`（D1–D9）、交易 `transaction_spec.md`、統計 `statistics_spec.md`。

---

## 給接手 session 的指示

1. **決策 S1–S9 已由使用者拍板（2026-06-14），不可自行更改**；認為有問題先問使用者。其中 **S4（Split 與 TransactionExtra 並存、比例攤提）** 是使用者明確要的，不要改回「互斥」。
2. **實作順序固定：Phase A（Tags）→ Phase B（Split）**。Tags 與核心解耦、風險低先出；Split 碰餘額/預算/統計核心後做。完成項目即更新 §10 勾選框。
3. **不變量是地基**（§6）：`Σ split.amount = transaction.amount`（原幣）、`Σ 各分類 activityInBase = netAmountInBase`。任何改動都要守住這兩條，否則餘額/預算/統計會三方不一致。
4. 多幣別約束：一筆交易隸屬單一帳戶＝單一幣別，**所有子項共用同一 `baseRate`** → 子項只在原幣配平即可，本位幣自然配平（只剩 rounding 尾差，§6.3 處理）。不要引入 Firefly 式多 leg 外幣配平。
5. 遵守 `CLAUDE.md` 的 GitNexus 流程：編輯任何 symbol 前先 `gitnexus_impact({target, direction:"upstream"})` 回報 blast radius，commit 前 `gitnexus_detect_changes()`。動 `transactionServices`、`budgetService`、`statisticsServices` 屬 HIGH 風險區，務必先跑。
6. 雙 migration 目錄：改 schema 要**同時**更新 `src/models/` 的 runtime 模型與 `database/migrations/` 的 migration（見 `CLAUDE.md`）。
7. 軟刪除串接：新表要掛進 `src/models/index.ts` 的 `afterDestroy` hook（`individualHooks: true`），刪父交易連帶刪 split / tag 關聯，刪 User 連帶刪 Tag。

---

## 1. Glossary

| 術語 | 說明 |
| --- | --- |
| **Split（拆分子項）** | 一筆交易底下的一列「分類 + 金額」。例：全聯 1200 → 食材 800 + 日用品 400。存於新表 `transaction_split` |
| **Parent（父交易）** | 被拆分的原交易。`isSplit = true`，本身是容器；其 `categoryId` 在拆分後僅作「列表顯示用主分類」，**不參與聚合** |
| **Gross（毛額）** | 子項的商品金額。`Σ split.amount` 恆等於父交易 `amount` |
| **Extra（父層加減項）** | 既有 `TransactionExtra`：整筆**一份**手續費 / 折扣。拆分後仍掛父層（S4），按子項比例攤提進各分類 activity |
| **Net（淨額）** | `amount ± extra`，驅動帳戶餘額。公式同現行 `calcAccountBalance`，**不因拆分而改變** |
| **Activity（分類消耗）** | 預算/統計用：某分類本期淨消耗（本位幣）。拆分後 = 子項本位毛額 + 該子項分到的 extra 份額 |
| **Tag（標籤）** | 跨分類的橫向標記（「日本旅遊 2026」「可報帳」）。多對多，掛在整筆交易（v1） |
| **Category vs Tag** | Category =「錢花在什麼上」（互斥、一筆一個 [拆分後一子項一個]、撐預算結構）；Tag =「為什麼/在哪/為了誰」（多對多、跨收支轉帳的正交切面） |

---

## 2. 競品對照摘要（已查證原始 schema，2026-06）

| 競品 | Split 模型 | 金額約束 | 父保留 category? | Tags |
| --- | --- | --- | --- | --- |
| **YNAB** | 父 + 內嵌 `subtransactions[]` | 子加總=父，Auto-Distribute 攤餘 | 否，變「Split (Multiple Categories)」容器 | 無 tags，只有 7 色 flag |
| **Actual** | 單表自參照 `isParent/isChild/parent_id` | 子加總=父，Distribute 平均/比例/逐分尾差 | 否，分類下放子項 | `#tag` 寫進 notes 文字（**不抄**：重命名/防錯弱） |
| **Firefly III** | group → journals（複式） | 每 journal 借貸平衡 | 無父 category 概念 | **真 many-to-many** `tag_transaction_journal`（標準） |
| **Lunch Money** | 父 + 子 `parent_id` | 子加總=父，可按 % | 否 | many-to-many `tag_ids[]`，子項可各自 tag |
| **Monarch** | 父 + 子 | 子加總=父 | 否 | many-to-many + 顏色 |

**採用結論**：Split 走 **YNAB/Lunch Money 的「父容器 + 子項計量」**（不採 Firefly 複式 group/journal，對個人記帳過度工程、更新 API 笨重）；金額配平 + Auto-Distribute 抄 **Actual + YNAB**；Tags 走 **Firefly 式真多對多中介表**，但砍掉 `tagMode`（balancing/advance payment，公認設計負債）、不抄 Actual 的 inline-`#tag`。來源見 §12。

---

## 3. 範圍

### 3.1 v1 做
- 拆分純收入 / 支出交易成多個分類子項（各自金額 + 選填備註）。
- 父層單一 `TransactionExtra` 與拆分**並存**，手續費/折扣按比例攤提進各分類預算（S4）。
- Tag 多對多，掛整筆交易；chip 多選 + autocomplete + on-the-fly 建立；Tag CRUD。
- 預算 / 統計正確消費拆分後的各分類；交易列表可依 tag 篩選。

### 3.2 v1 不做（記取競品踩過的坑，schema 預留）
- ❌ **子項作為轉帳一端**（YNAB 有、但 Actual issue #3802 證明這條路陷阱多）→ Split 只開放 `type ∈ {INCOME, EXPENSE}`，轉帳（`OPERATE`/`linkId` 非空）不可拆。
- ❌ **per-split tag**（Firefly issue #2063：schema 支援但 UI 半殘，使用者抱怨）→ join 表預留 `splitId` 欄但 v1 UI 只掛整筆。
- ❌ **per-split 各自 extra**（每子項自己的手續費）→ v1 只有父層一份（S4）。
- ❌ 分期（`installmentPlanId` 非空）與拆分並用 → v1 互斥。
- ❌ Tag 帶獨立預算金額 / 地理座標 / tagMode。

---

## 4. 設計決策（S1–S9，使用者已拍板，不可自行更改）

| # | 決策 | 結論 | 理由 |
| --- | --- | --- | --- |
| **S1** | 實作順序 | **Tags 先（Phase A）→ Split 後（Phase B）** | Tags 與餘額/預算解耦、風險低、能快速出價值；Split 碰核心，等 helper 收斂 blast radius 再動 |
| **S2** | Split 儲存模型 | **獨立子表 `transaction_split`**（非 Actual 自參照單表） | `Transaction` 欄位極多（多幣別/分期/轉帳/對帳），自參照會讓子項繼承無意義欄位 |
| **S3** | 父交易 `categoryId` | **保留欄位但語意降級為「列表顯示主分類」**，聚合一律走 §5.4 helper，父本身不計 | 不必把欄位改 nullable、不破壞既有讀 `categoryId` 的顯示碼；避免父子重複計 |
| **S4** | Split 與 TransactionExtra 關係 | **並存**：splits 拆毛額、父層保留**單一** extra，extra 按子項毛額比例攤提進各分類 activity | 使用者明確要：整筆一份手續費/折扣很自然；比例攤提守住「Σ activity = net」不變量 |
| **S5** | 金額不變量 | **子項在原幣配平**：`Σ split.amount = transaction.amount`；提供「平均 / 比例分配 + Auto-Distribute 餘額」 | 同帳戶＝單幣→原幣配平即可；尾差逐分派發（抄 Actual） |
| **S6** | 預算/統計聚合 | 新增**單一真實來源** helper `expandToCategoryActivity(tx)`，預算與統計都改走它（取代直接 `GROUP BY categoryId`） | blast radius 收斂到一處；保證兩邊一致 |
| **S7** | Tag schema | **真多對多**：`tag` + `transaction_tag` 中介表；tag 有 `name/color/groupName?` | 查詢/重命名/篩選乾淨；明確不抄 inline-notes |
| **S8** | Tag 掛載粒度 | **v1 掛整筆交易**；join 表預留 `splitId` 供未來 per-split | 避免 Firefly #2063 的半殘；先出整筆價值 |
| **S9** | Tag vs Category 定位 | Category 撐預算縱向結構（互斥）；Tag 提供正交橫向切面（多對多、跨收支轉帳） | 兩者並存的產品理由，寫進 UI 文案 |

> ⚠️ S4 的攤提規則（比例 vs 指定單一子項）使用者選「比例攤提」。若日後要「折扣只屬某一項」，那是 per-split extra（v1 不做，§3.2）。

---

## 5. 資料模型

### 5.1 新表 `transaction_split`

```
transaction_split
  id            UUID PK
  transactionId UUID FK → transaction(id)   // 父交易
  categoryId    UUID FK → category(id)       // 任意層級，預算 roll-up 到 Main（budget B1）
  amount        DECIMAL(20,5)                // 原幣毛額（= 帳戶幣別，同父）
  amountInBase  DECIMAL(20,5)                // amount × 父 baseRate（本位幣快照，寫入時算）
  note          STRING NULL                  // 子項備註
  sortOrder     INTEGER                      // UI 排序
  (paranoid soft-delete，比照 transaction)
```
> `amountInBase` 沿用既有「寫入時快照」哲學（同 `transaction.amountInBase` / `extra*InBase`）。**extra 份額不存進此欄**——extra 攤提在 §5.4 helper 算，保持 `amount/amountInBase` 純粹是「商品毛額」。

### 5.2 `transaction` 新增欄位
```
isSplit  BOOLEAN NOT NULL DEFAULT false
```
拆分時：`isSplit = true`；`amount` 仍存毛額總和（= `Σ split.amount`）；`extra*` 照舊掛父層；`categoryId` 留作顯示主分類（取第一個子項分類，S3）。

### 5.3 新表 `tag` 與 `transaction_tag`
```
tag
  id        UUID PK
  userId    UUID FK → user(id)
  name      STRING        // per-user 唯一（大小寫不敏感建議）
  color     STRING        // hex
  groupName STRING NULL   // 可選分組（v2 用）
  isArchived BOOLEAN DEFAULT false
  (paranoid soft-delete)

transaction_tag                       // 多對多中介
  transactionId UUID FK → transaction(id)
  tagId         UUID FK → tag(id)
  splitId       UUID NULL FK → transaction_split(id)   // 預留 per-split（v1 恆為 NULL）
  PRIMARY KEY (transactionId, tagId)    // v1 粒度；改 per-split 時主鍵含 splitId
```

### 5.4 聚合單一真實來源 `expandToCategoryActivity(tx)`（S6 核心）

放 `src/logic/`（純運算，比照 `budgetLogic.ts`）。把一筆交易展開成「分類 → 本位幣淨消耗」列，**預算與統計都只准消費它**：

```
expandToCategoryActivity(tx) -> Array<{ categoryId, activityInBase }>

非拆分 (isSplit=false):
  netInBase = amountInBase ± extra*InBase           // 同現行單筆語意
  return [{ categoryId: tx.categoryId, activityInBase: signed(netInBase) }]

拆分 (isSplit=true):
  extraNetInBase = extraMinusInBase - extraAddInBase           // 支出向；收入向取反
  total = Σ split.amountInBase
  for each split:
     share = round( extraNetInBase * split.amountInBase / total )   // 比例攤提
     activityInBase = signed( split.amountInBase + share )
  // 尾差：Σ share 對不上 extraNetInBase 時，把差額逐分加到最大子項（§6.3）
  return rows
```
`signed()` 依 `type` 給正負（支出為負、收入為正），與既有預算 activity 慣例一致。

---

## 6. 金錢語意與不變量（地基）

### 6.1 帳戶餘額：**完全不變**
餘額路徑仍只看 `transaction.amount` + `extra` → `netAmount`（`calcAccountBalance`，`transactionServices.ts:275-293`）。拆分**不碰餘額計算**，只多一條寫入驗證：`Σ split.amount === amount`（原幣）。這是本設計把風險壓低的關鍵——餘額路徑零行為變更。

### 6.2 兩條不變量（任何改動都要守）
1. **原幣配平**：`Σ split.amount = transaction.amount`
2. **本位幣淨額守恆**：`Σ expandToCategoryActivity(tx).activityInBase = signed(netAmountInBase)`
   其中 `netAmountInBase = amountInBase + extraMinusInBase − extraAddInBase`（支出向）。

### 6.3 Worked Example（全聯，單幣 baseRate=1）

全聯 1200 → 食材 800 + 日用品 400，整筆袋子手續費 `extraMinus = 6`，無折扣，`type = EXPENSE`。

- 配平：`800 + 400 = 1200 = amount` ✓
- 餘額：`netAmount = 1200 + 6 − 0 = 1206` → 帳戶 −1206（與未拆分時一模一樣）
- 各分類 activity（本位幣、支出為負）：
  - 食材 share = `6 × 800/1200 = 4` → `−(800 + 4) = −804`
  - 日用品 share = `6 × 400/1200 = 2` → `−(400 + 2) = −402`
  - Σ = `−1206 = −netAmountInBase` ✓

**尾差規則**：若 share 出現除不盡（如 fee=5 → 3.33 / 1.67），用最大餘數法（largest remainder）逐分（cent）派發，差額補到金額最大的子項，確保 Σ 精確等於 `extraNetInBase`。（抄 Actual 的 Distribute 尾差處理。）

> 你的「晚餐」場景同理：晚餐 300 + 點心 100 + 飲料 50 = 450，服務費 10%（extra=45）→ 攤成 330/110/55，Σ=495=net。

### 6.4 跨幣
子項與父同帳戶同幣別 → 共用父 `baseRate`，`split.amountInBase = split.amount × baseRate`。因 `Σ split.amount = amount` 且 rate 相同，`Σ split.amountInBase = amountInBase`（只剩 §6.3 尾差）。**無需** Firefly 式多 leg 外幣配平。

---

## 7. Blast Radius / 受影響檔案

> 動工前對下列 symbol 逐一 `gitnexus_impact`。標 🔴 為 HIGH 風險（碰餘額/預算/統計核心）。

| 層 | 檔案 / symbol | 變更 | 風險 |
| --- | --- | --- | --- |
| 模型 | `apps/backend/src/models/transactionSplit.ts`（新）、`tag.ts`（新）、`transactionTag.ts`（新） | 新增 | 低 |
| 模型 | `apps/backend/src/models/transaction.ts` | 加 `isSplit`、`hasMany(TransactionSplit)`、`belongsToMany(Tag)` | 中 |
| 模型 | `apps/backend/src/models/index.ts` | 關聯 + `afterDestroy` 串接刪 split/tag（`individualHooks`） | 🔴 中 |
| migration | `apps/backend/database/migrations/*`（新增 3–4 支） | 建表 + alter | 中 |
| 純運算 | `apps/backend/src/logic/expandToCategoryActivity.ts`（新，S6） | 新增單一真實來源 | 中 |
| service | `apps/backend/src/services/transactionServices.ts` `createTransaction` / `updateIncomeExpense` / `deleteTransaction` | 寫入/更新/刪除 splits + tags、配平驗證 | 🔴 高 |
| service | `apps/backend/src/services/budgetService.ts`（activity 聚合，約 200–390） | 改走 `expandToCategoryActivity` | 🔴 高 |
| service | `apps/backend/src/services/statisticsServices.ts`（分類圓餅 `getOverviewTop3Categories` 等，約 125–250） | 改走 helper / 或建 SQL view；新增 tag 篩選 | 🔴 高 |
| service | `apps/backend/src/services/tagServices.ts`（新） | Tag CRUD + 套用 | 低 |
| route/ctrl | `transactionRoute/Controller`、`tagRoute/Controller`（新） | 接 splits/tagIds、Tag CRUD、`?tagIds=` 篩選 | 中 |
| shared | `packages/shared/src/schemas/transaction.schema.ts`、`tag.schema.ts`（新） | 加 `splits[]` / `tagIds[]`、配平 refine、Tag schema | 中 |
| shared | `packages/shared/src/types/transactionTypes.ts`、`tagTypes.ts`（新） | 型別 | 低 |
| 前端 | `apps/frontend/src/components/transactions/transactionSheet.tsx` | 拆分開關 + 子項列 + 即時加總/分配；tag chip 多選 | 中 |
| 前端 | `apps/frontend/src/services/tagService.ts`（新）、交易服務擴充 | API 接線 | 低 |
| 前端 | tag 管理頁（設定內，可極簡）、交易列表 tag 篩選 + 顯示 | 新增 | 中 |

---

## 8. 邊界與一致性規則

- **刪除父交易**：soft-delete 串接刪 `transaction_split` + `transaction_tag`（`models/index.ts` afterDestroy + `individualHooks`）。餘額回沖照舊（只看父 net）。
- **更新交易**：改 splits = 先全刪舊子項再建新；同步重算各 `amountInBase`、重跑配平驗證；extra 改動自動透過 helper 重新攤提（無需物化）。
- **拆分前置檢查**（後端 + 前端雙驗）：`type ∈ {INCOME,EXPENSE}`、`linkId IS NULL`（非轉帳）、`installmentPlanId IS NULL`（非分期），否則拒絕拆分（§3.2）。
- **信用卡**：因 budget 走 §5.4 helper，每個子項自然各自驅動對應信封與 Credit Card Payment category（接 `budget-ynab-spec` Phase 2 機制），無需特例。
- **Tag 刪除**：刪 Tag → 串接刪 `transaction_tag` 關聯（交易本身不動）。重命名安全（中介表存 id）。
- **Excel / PDF 匯入**：v1 匯入不產生 split（維持單分類）；tag 匯入欄位 v2 再議。

---

## 9. UX 設計

### 9.1 拆分（`transactionSheet.tsx`）
- 分類欄旁一個 **「拆分」** 開關 → 展開子項列（分類選擇 + 金額 + 選填備註），可增刪列。
- **即時加總驗證**：頂部顯示「已分配 X / 總額 Y，剩餘 Z」；未配平時 Z≠0 標紅、送出 disabled。
- **分配按鈕**：「平均分配」/「按比例分配」+「把剩餘額分配到空白列（Auto-Distribute）」，尾差逐分（§6.3）。
- 手續費/折扣（既有 extra UI）維持一份，置於子項列表外（父層），文案提示「整筆共用，將按比例計入各分類預算」。
- 列表/明細顯示：父交易顯示主分類 +「拆分」標記，可展開看子項。

### 9.2 標籤
- 交易表單「標籤」欄：**多選 chip + autocomplete**，輸入 fuzzy match 既有 tag，找不到「建立新標籤」即時建立（帶預設色）。
- 列表顯示：chip 帶顏色；可設「只顯示第一個 / 全顯示」。
- 篩選：交易列表加 tag 篩選（多選）；統計頁把 tag 與 category 並列為一等篩選維度。
- 管理：設定內極簡 Tag 管理（改名/換色/封存/刪除）。

---

## 10. Phase 切分與進度

### Phase A — Tags（S1 先做，低風險）✅ 完成（2026-06-15）
- [x] `tag` / `transaction_tag` 模型 + migration（雙目錄）— `models/tag.ts`、`transactionTag.ts`、`20260614020000-create-tags.js`（皆 paranoid:false，避 unique 撞殘列）
- [x] `models/index.ts` 關聯 + afterDestroy 串接（User→Tag、Tag→transaction_tag、Transaction→transaction_tag）
- [x] shared `tag.schema.ts` / `tagTypes.ts`；`createTransaction/update`/form schema 加 `tagIds[]`、`?tagIds` 查詢
- [x] `tagServices` + route/controller（Tag CRUD，掛 `/api/tags`）；交易 create/update/transfer 套用 tagIds（含分期每期）
- [x] 交易查詢支援 `?tagIds=` 篩選（match ANY，另撈中介表避免分頁 row 複製）；回應帶 tags
- [x] 前端：`TagMultiSelect` chip 多選 + on-the-fly 建立（接入 `transactionSheet`）；列表 `transactionTable` 顯示；`transactionFilters` 篩選；settings「標籤管理」分頁（`tagSettings`）
- [x] 測試：backend `tests/integration/tagFlow.test.ts`（8：CRUD/套用/篩選/串接刪除）、frontend `tagMultiSelect.test.tsx`（3：chip/popover/建立）。修 `account_controller.test.ts` 的 define mock 補 `addHook`
- [x] E2E 字幕示範影片：`e2e/tags-demo.spec.ts` + `playwright.tags.config.ts`（掛標籤含即時建立 → 列表 chip → 篩選），影片 `tags-e2e-videos/tags-phase-a-demo.webm`

> **動工/手測提醒**：改過 `@repo/shared` 後務必重啟後端 dev——`tsx watch` 不重載 workspace 套件，舊 schema 會默默把新欄位（如 `tagIds`）strip 掉，導致存不進去。

### Phase B — Split（S1 後做，碰核心）✅ 完成（2026-06-15）
- [x] `transaction_split` 模型 + migration（`20260615000000`）；`transaction.isSplit` + 關聯（皆 paranoid:false）
- [x] `models/index.ts` afterDestroy 串接刪 split（User→Transaction→split）
- [x] **S6 落地為 DB view `transaction_split_unit`**（migration `20260615010000`）取代 JS helper（§7 允許）：非拆分=整筆一列、拆分=每子項一列且 extra 按 gross 比例攤提；對非拆分資料與現況逐位相同
- [x] shared schema：`splits[]`（splitInputSchema）+ 配平/前置 refine（create/update/transfer）+ 前端 form schema（mainCategory 改 optional，元件 superRefine 補必填）
- [x] `transactionServices` create/update/delete 寫入/重建/串接刪除 splits、配平驗證、extra 並存；list/byId 回應帶 splits
- [x] `budgetService`（activity/inflow/cardSpend）改走 view（repay 為轉帳不動）
- [x] `statisticsServices` 分類圓餅/分類分頁改走 view（account/月趨勢為非分類維度不動）
- [x] 前端拆分 UI：`SplitEditor`（子項列 + 即時加總 + 平均/補剩餘）接入 `transactionSheet`（拆分開關、前置 disable）；列表 `transactionTable` 顯示「拆分 N」標記
- [x] 測試：backend `tests/integration/splitFlow.test.ts`（8：不變量/餘額不變/view 攤提/更新/取消/跨幣/串接刪除/前置）；既有 budget/stats 全套綠（view 對非拆分零行為變更）。本機 backend 198 / frontend 49 綠

> **S6 取捨備忘**：原 §5.4 規劃 JS helper `expandToCategoryActivity`；因 budget/statistics 皆原生 SQL 聚合，改以 DB view 為單一真實來源（§7 已允許「helper 或 SQL view」），消費端僅將 `FROM transaction+extra` 換成 view、`e.extra` 改 `t.extra`，對既有非拆分資料零行為變更。

---

## 11. 測試重點（守不變量）

- **§6.2 不變量**：建立/更新拆分後，斷言 `Σ split.amount === amount` 且 `Σ activityInBase === signed(netAmountInBase)`（含 extra）。
- **餘額零變更**：同金額同 extra，拆分 vs 不拆分，帳戶餘額一致。
- **預算一致**：拆到多 Main 信封 → 各信封 activity 正確、roll-up 正確；信用卡子項驅動 CC Payment。
- **尾差**：除不盡的 extra（如 fee=5、三子項）→ Σ 精確守恆。
- **跨幣**：外幣帳戶拆分 → 各 `amountInBase` 用同 baseRate、Σ 守恆。
- **前置檢查**：轉帳/分期交易拒絕拆分。
- **串接刪除**：刪父交易/刪 User → split & tag 關聯清乾淨。

---

## 12. 查證來源（2026-06）

- YNAB Split：https://support.ynab.com/en_us/split-transactions-a-guide-SJLEKwY0q ；SubTransaction model：https://github.com/dmlerner/ynab-api/blob/master/docs/SubTransaction.md
- Actual Split：https://actualbudget.org/docs/transactions/split-transactions/ ；schema `init.sql` + `parent_field` migration（repo actualbudget/actual）；transfer 子項 bug #3802
- Firefly III 交易/journal + tags pivot（migration `2016_06_16_000002_create_main_tables.php`，repo firefly-iii/firefly-iii）；per-split tag 限制 #2063；tagMode 混亂 discussion #10691
- Lunch Money Tags：https://support.lunchmoney.app/setup/tags ；Transaction object（tags/parent_id/group_id）：https://github.com/lunch-money/api-docs/blob/master/transactions/transaction-object.md
- Monarch Tags：https://help.monarch.com/hc/en-us/articles/4409690120596-Organizing-Transactions-with-Tags
- Tag vs Category 語意：https://help.copilot.money/en/articles/9554367-tags-vs-categories ；https://info.quicken.com/sim/categories-vs-tags-what-s-the-difference

---

## 13. 重現 E2E 示範影片（Tags Phase A）

> 影片本身是產物（`apps/frontend/tags-e2e-videos/`、`test-results-tags/` 皆 `.gitignore`，不入版控），
> 任何 clone 者用以下指令即可在本機**重新產生相同的操作流程影片**。

**一次性前置**（每位 clone 者各自設定）：
```bash
pnpm install
# 1) 設定環境變數（不入版控）
#    apps/backend/.env：PG_USER/PG_PASSWORD/PG_DATABASE/PG_HOST/PG_PORT、MONGODB_URL …
#    apps/frontend/.env：NEXT_PUBLIC_API_DOMAIN=http://localhost:3000/api
# 2) 套用 migration 建 tag / transaction_tag 表
cd apps/backend && pnpm db:migrate:up
```

**產生影片（一行指令）**：
```bash
cd apps/frontend && pnpm test:e2e:tags
```
- 此指令透過 `playwright.tags.config.ts` 的 `webServer` **自動啟動後端（:3000，`ORIGIN_URL=http://localhost:8090`）與前端（:8090）**，再跑 `e2e/tags-demo.spec.ts`。
- 已在跑的 :3000 / :8090 會被重用（`reuseExistingServer`）。
- 影片輸出於 `apps/frontend/test-results-tags/<test>/video.webm`（內嵌中文字幕旁白）。

**示範涵蓋**：交易表單 chip 多選既有標籤 + on-the-fly 即時建立 → 列表彩色 chip → 依標籤篩選。
（標籤管理頁未入影片，由 `tagFlow.test.ts` + `tagSettings` 測試覆蓋，原因見該 spec §10。）

## 14. 重現 E2E 示範影片（Split Phase B）

前置同 §13（含 migration）。**產生影片（一行指令）**：
```bash
cd apps/frontend && pnpm test:e2e:split
```
- 透過 `playwright.split.config.ts` 自動啟動後端（:3000，`ORIGIN_URL=:8090`）與前端（:8090），跑 `e2e/split-demo.spec.ts`。
- 影片輸出於 `apps/frontend/test-results-split/<test>/video.webm`（內嵌中文字幕旁白）。
- **示範涵蓋**：新增交易輸入總額 → 開啟拆分 → 子項分類/金額 → 即時加總（剩餘→已配平）→ 儲存 → 列表「拆分 N」標記。

> ⚠️ 若剛改過 `@repo/shared` 的 schema，重跑前先重啟後端 dev：`tsx watch` 不重載 workspace 套件，
> 舊 schema 會默默把新欄位（如 `tagIds`/`splits`）strip 掉，導致存不進去。
