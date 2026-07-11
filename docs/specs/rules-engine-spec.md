# 規則引擎 (Auto-categorization Rules) — 技術規格

> Roadmap Tier 1 #2。唯一真實來源。決策 R1–R14 已拍板（2026-07-11），除非使用者明示，不自行更改。
> 依賴既有：分類系統、標籤系統 (split-tags-spec Phase A)、PDF 帳單解析 (`billParseService`)。

## 0. 背景與定位

專業記帳工具（YNAB / MoneyWiz / Money Manager）皆有「規則引擎」：定一次規則，之後交易自動套分類/標籤，匯入不用逐筆手選。

現況：`MerchantMapping`（商家名 → 分類 + `matchCount`）**只服務 PDF 帳單解析、使用者不可見**，且有安全缺陷（見下）。本規格把它升級為使用者可維護的自動化工具（**選項 B**：系統照使用者自己的習慣學習 + 使用者可看可改 + 疊加顯式自訂規則）。

### 🐞 現存洩漏 bug（本規格一併修）

`merchant_mapping` 是**全域表、無 `userId`**（`models/MerchantMapping.ts`）。查詢只用 `merchantName` filter、`order by matchCount DESC`，`categoryId` 卻是 FK 到 `category`——而 `category.userId` 可為某使用者的**自訂分類**。故全域 mapping 會把「A 使用者的私有 `categoryId`」回傳給 B 使用者的帳單解析 → 跨使用者資料洩漏（`billParseService.ts:56`、`pdfService.ts:398` upsert 亦全域累加）。

---

## 1. 已鎖定的設計決策 (R1–R14)

### R1 — 範圍分兩層、三 Phase（順序固定）

- **Phase A — 修洩漏 + 自動學習 per-user + 管理 UI**（= 選項 B + 修 bug 的直接需求，獨立可上線）
- **Phase B — 顯式規則引擎**（`transaction_rule` + 條件/動作 + 套用三入口，Tier 1 主體）
- **Phase C — payee/商家 first-class entity（本輪不做）**：transaction 目前無 `payee` 欄，升為可管理實體＝schema + 回填 + 全 UI，另立規格。

### R2 — `merchant_mapping` 加 `userId`（NOT NULL）

新增 `userId` FK → `user`，`onDelete CASCADE`。所有查詢與 upsert 一律 `where userId`。修洩漏根因。

### R3 — Migration 清空既有 rows

既有 `merchant_mapping` 為全域眾包資料、低價值且是洩漏來源。Migration **DELETE 全部既有 rows**（per-user 學習很快重建），再改唯一鍵 `(userId, merchantName, categoryId)`。**部署需跑 migration**。

### R4 — 自動學習語意不變，只改成 per-user

確認帳單入帳時，對 `(userId, merchantName, categoryId)` upsert 並 `matchCount += 1`。查詢時 `where userId` + `order matchCount DESC` 取最佳匹配（既有 substring 雙向包含邏輯不變）。

### R5 — 管理 UI（Phase A）

新增 `merchant_mapping` 加 `isEnabled` BOOLEAN（預設 true）。使用者可：列出自己學到的 mapping、改 `categoryId`、刪除、停用（停用者不參與匹配）。**手動新增 mapping** 視為 Phase B 顯式規則的簡化，不在 Phase A（Phase A 只治理「已學到的」）。

### R6 — 顯式規則 model `transaction_rule`（Phase B）

| 欄位 | 型別 | 說明 |
|---|---|---|
| id | UUID PK | |
| userId | UUID NOT NULL FK user, CASCADE | |
| name | STRING? | 使用者標記（可空） |
| priority | INTEGER NOT NULL | asc 先評，值小先跑；同值以 `createdAt` 破平手 |
| isEnabled | BOOL NOT NULL default true | |
| descriptionMatch | STRING? | 對 `transaction.description` 比對 |
| matchMode | ENUM(CONTAINS/EQUALS/STARTS_WITH) default CONTAINS | 大小寫不敏感 |
| amountMin | DECIMAL(20,5)? | 含端點 |
| amountMax | DECIMAL(20,5)? | 含端點 |
| transactionType | ENUM(EXPENSE/INCOME)? | null = 任意 |
| setCategoryId | UUID? FK category | 動作：套分類 |

標籤動作走 join table **`transaction_rule_tag`**（`ruleId`, `tagId`），比照 `transaction_tag`。

### R7 — 比對欄位 = `transaction.description`

Transaction **無 `payee` 欄、不新增**。規則對 `description` 文字比對。payee/商家 first-class 留 Phase C。

### R8 — 條件組合 = AND only

一條規則內所有已填條件 **AND**。要 OR → 建多條規則。v1 不做規則樹 / OR 群組 UI。

### R9 — 統一 resolver `resolveCategorization(userId, draft, ctx)`，優先序：

`draft = { description, amount, type }`；回傳 `{ categoryId, tagIds[], source }`。

1. **顯式規則**（`isEnabled`、priority asc）：**第一個命中且有 `setCategoryId` 的規則決定分類**（first-match-wins）；**所有命中規則的 `tagIds` 取聯集**（accumulate，比照批次加標籤 append 聯集語意）。
2. 若步驟 1 未給分類 → **MerchantMapping 自動學習**（fallback，per-user）。
3. 若仍無分類且 `ctx = bill-parse` → **LLM 建議**（既有邏輯）。
4. 否則沿用呼叫端既定 / null。

手動 / Excel 無步驟 3。

### R10 — 套用入口三處（僅新建/匯入）

`transactionServices`（手動新增）、`excelServices`（匯入）、`billParseService`（帳單確認）。

**不套規則**：轉帳（兩 leg 分類語意特殊）、拆分子項、週期產生（用模板既定分類）、**編輯既有交易**。

### R11 — 不回溯

規則只影響「之後新建/匯入」的交易，不批次重跑歷史（避免大量非預期變更）。未來可加「試跑 / 套用到選取交易」（匯流 Tier 2 批次改分類）。

### R12 — Cascade / 防呆

- 刪 Tag → 清 `transaction_rule_tag`（擴充 `Tag.afterDestroy`）。
- 刪 Rule → 清 `transaction_rule_tag`（`transaction_rule.afterDestroy`）。
- 刪 User → 串接清 `transaction_rule` / `merchant_mapping`（比照 `models/index.ts` 現有 afterDestroy）。
- 分類 soft-delete 後：套用階段若 `setCategoryId` 指向已刪分類則**跳過該動作**（不硬清規則）。
- `setCategoryId` 建立/更新時驗證擁有權（本人 or `userId = null` 預設分類）；標籤同理只接受本人 tag。

### R13 — `@repo/shared` 單一真實來源

新增規則的 Zod schema / 型別（create / update / list / apply-preview），前端表單 resolver 與後端 `validate` middleware 共用。

### R14 — 測試（真實 DB 整合，`fileParallelism:false`）

- **洩漏修復**：A 的 mapping 不出現在 B 的解析。
- **per-user 隔離**：規則、mapping 皆隔離。
- **resolver 優先序**：規則 > mapping > llm；first-match-wins 分類；標籤聯集。
- **AND 條件**：description + amount 區間 + type 全需符合。
- **三入口**：手動 / excel / bill 皆套；轉帳 / 拆分 / 週期 / 編輯 不套。
- **不回溯**：既有交易不變。
- **cascade**：刪 tag/rule/user 清乾淨。

---

## 2. 進度追蹤

### Phase A — 修洩漏 + per-user 自動學習 + 管理 UI ✅ 2026-07-11

- [x] `merchant_mapping` 加 `userId`(NOT NULL) + `isEnabled` + 改唯一鍵 `(userId,merchantName,categoryId)`；model + migration（`20260711000000-merchant-mapping-per-user`，含 DELETE 既有 rows；已套用 dev DB）
- [x] `billParseService.batchSuggestCategories` 加 userId 參數 + `where userId,isEnabled` / `pdfService` upsert 併 userId（ON CONFLICT 對齊新 3 欄鍵）（scope 修洩漏）
- [x] `models/index.ts`：`User.afterDestroy` 串接清 `merchant_mapping`
- [x] `@repo/shared`：merchantMapping update/list schema + types（index 匯出）
- [x] 後端 CRUD：list / update(categoryId/isEnabled) / delete（route→controller→service，app.ts mount）
- [x] 前端管理頁 `/merchant-mappings`：清單 + 改分類 + 停用 + 刪（SWR）；側欄「商家分類」
- [x] 測試：7 真實 DB 整合測試綠（洩漏修復 / per-user 隔離 / isEnabled / 改分類擁有權+撞鍵 / cascade）；後端全套零回歸
- [x] 對抗式審查（5 維度 workflow）：2 前端缺陷（list error 吞掉→假空狀態；分類非葉節點→Select 空白）已修；後端/migration/洩漏/cascade 零缺陷

### Phase B — 顯式規則引擎 ✅ 2026-07-11

- [x] model `transactionRule` + `transactionRuleTag` + migration（`20260711010000-create-transaction-rule`；已套用 dev DB）
- [x] `models/index.ts`：關聯（Rule↔Tag、Rule→setCategory）+ afterDestroy（Rule→ruleTag、Tag→ruleTag、User→rule）
- [x] `@repo/shared`：rule create/update/reorder/list schema + 型別（`RuleMatchMode` enum）
- [x] 核心 `resolveCategorization(userId, draft, ctx)`（`logic/categorizationLogic.ts` 純運算 + `services/categorizationService.ts` DB）+ 12 單元 + 7 整合測試綠（優先序 / AND / 標籤聯集 / merchant+llm fallback / 軟刪分類跳過 / per-user 隔離）
- [x] 接入三入口：`transactionServices.createTransaction`（手動 + Excel，excel 共用此函式）+ `pdfService.confirmTransactions`（帳單確認）。轉帳/週期/拆分子項/編輯天然排除
- [x] 後端 CRUD route→controller→service（`/rules` list/create/update/delete/reorder；per-user + 分類/標籤擁有權驗證）
- [x] 前端規則管理頁 `/rules`（列表 + builder Dialog：條件/動作 + 排序 + 啟停 + TagMultiSelect 重用）
- [x] 三入口 + 不回溯整合測試（4 wiring + 7 CRUD + 7 resolver + 12 unit 全綠）
- [x] 對抗式審查（4 維度 workflow：CRUD / 接線 / 前端，各對抗式複驗）+ 修復 1 major + 6 minor：
  - 前端：錯誤訊息被 `instanceof Error` 吞掉 → 改用既有 `getErrorMessage`（apiHandler throw 的是 ResponseHelper）；表單改以共用 `createTransactionRuleSchema` 驗證（R13 單一真實來源）；reorder 於「顯示已停用」關閉時鎖定並防連點；編輯下拉為軟刪/非葉分類補備援選項；金額輸入 `min=0`。
  - 後端：`updateRule` 對「合併結果」重驗規則不變式（防 partial PUT 清空所有條件 → 命中全部交易）；create/update `tagIds` 去重（避免撞 rule_tag 複合 PK）；帳單確認過濾 client 注入的外人 `tagIds`；手動 pending 英文 `type`（`expense`）正規化為 `RootType`（否則帶 type 條件規則永不命中且存入無效 type）。
  - 測試：補 6 整合測試（CRUD 去重/合併重驗；帳單確認 type 正規化 + 外人 tag 過濾）；修 4 個受接線波及的 mock 單元測試（以 no-op mock `categorizationService` 隔離規則引擎）。

> **R9 釐清（wiring 落地）**：分類「fill-when-absent」— 規則/自動建議只在呼叫端無明確分類時填入，**不覆蓋使用者明確選擇**；標籤一律與使用者提供者取聯集。帳單確認時「使用者明確改過」= `data.categoryId` 與自動建議不同，永遠優先。手動/Excel 分類為必填，故規則對其實際只加標籤；分類套用主要發生於帳單確認。

### Phase C — payee/商家 first-class（本輪不做，另立規格）

---

## 3. 給接手 session 的指示

1. 動工前完整讀本檔第 1 節（R1–R14 已拍板不可自改）。
2. **嚴格 Phase A → B 順序**，各為獨立可上線單位；一次一個 Phase。
3. 改 schema 要同步 `src/models/`（runtime）與 `database/migrations/`（sequelize-cli），見 CLAUDE.md「migration 與 runtime 模型分離」。
4. 改請求/回應形狀先動 `@repo/shared` schema。
5. 每完成一項即更新第 2 節勾選框。
6. 編輯任何既有 symbol 前跑 `impact`（CLAUDE.md 強制）。
