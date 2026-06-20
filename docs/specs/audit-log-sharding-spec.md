# Audit Log + MongoDB 水平擴展 規格 — Audit Log & Sharding Lab

> **文件狀態**: 🟢 **v1 實作完成（2026-06-17，未 commit）**。決策 A1–A9 已拍板；A9 缺口已補（全實體接線）。
> **最後更新**: 2026-06-17
> **定位**: 本功能的**主要目的是練習 NoSQL 水平擴展（MongoDB sharding）**，audit log 只是承載這個練習的載體（append-only、per-user、寫多、可乾淨分片）。
> **對應 Roadmap**: `todo.md` Tier 3「稽核紀錄 / 變更歷史」＋「NoSQL 水平擴展候選分析」中的 🥈 audit log（shard-by-user 教科書案例）。
> **部署備忘**: audit log 存於**獨立的 MongoDB 連線**（`AUDIT_MONGODB_URL`），與主 Mongo（Atlas，KnowledgeChunk/Announcement）分離。本機練習用 `apps/backend/docker/mongo-shard/` 的 sharded cluster；生產可先單 replica set，量大再升級分片（Atlas 免費層不支援分片，需 M30+）。本機測試綠：backend 165 unit（含 audit 18）+ 整合 tagFlow/budgetFlow 29。

---

## 給接手 session 的指示

1. **決策 A1–A9 已由使用者拍板（2026-06-16），不可自行更改**；認為有問題先問使用者。
2. **核心是 sharding 練習**：shard key = `{ userId: 1, createdAt: 1 }`（A2），改動務必同步 `src/models/auditLog.ts` 的索引與 `docker/mongo-shard/init-cluster.js` 的 `shardCollection`，兩者必須完全一致，否則 `sh.shardCollection` 會失敗或走錯索引。
3. **best-effort 是地基（A4）**：audit 寫入失敗**絕不**回滾或中斷使用者交易。所有 `recordAudit` 一律在 PG transaction **commit 之後** 以 `void recordAudit(...)` fire-and-forget 呼叫；`recordAudit` 自身吞例外、`NODE_ENV=test` 或連線未就緒時直接略過。
4. **遵守 `CLAUDE.md` 的 GitNexus 流程**：編輯 `transactionServices` 屬 HIGH 風險區，動工前先 `gitnexus_impact`。本次接線為純附加（commit 後 fire-and-forget），impact 回報 LOW、0 direct caller。
5. **append-only（A7）**：audit 永不更新 / 刪除既有紀錄。不要為 audit 加 update/delete 路徑。
6. 連線分離（A1）：audit 用 `mongoose.createConnection`（`src/utils/auditMongo.ts`），**不要**併進 `utils/mongodb.ts` 的主連線。

---

## 1. Glossary

| 術語 | 說明 |
| --- | --- |
| **Audit log（稽核紀錄）** | 一筆「誰、在何時、對哪個實體、做了什麼變更」的 append-only 紀錄。存於 MongoDB collection `auditlogs` |
| **shard key** | 決定文件落在哪個 shard 的鍵。本案 = `{ userId: 1, createdAt: 1 }`（compound ranged） |
| **targeted query** | 查詢帶 shard key 前綴（如 `userId`）→ mongos 只路由到單一 shard |
| **scatter-gather** | 查詢不帶 shard key → 廣播到所有 shard 再彙整（慢、不可擴展） |
| **chunk** | 一段連續 shard key 範圍的資料區塊；超過 chunk size 會分裂，balancer 在 shard 間搬移 |
| **jumbo chunk** | 無法再分裂的過大 chunk（單一 shard key 值的資料超過上限）。compound key 的低位欄是為了避免它 |
| **before / after** | 變更前 / 後的實體快照。CREATE → before=null；DELETE → after=null |
| **changes** | UPDATE 時由後端 diff 出的 top-level 欄位變更清單（`{ field, from, to }[]`） |

---

## 2. 範圍

### 2.1 v1 做
- MongoDB 專用連線 + `AuditLog` Mongoose model（shard key 對應索引）。
- `recordAudit`（commit 後 best-effort 寫入）接線**全部 mutation 入口**（A5）：
  - 交易：`createTransaction` / `updateIncomeExpense` / `deleteTransaction` / `createTransfer` / `updateTransfer`。
  - 帳戶：新增 / 編輯 / 刪除 / 封存 / 解除封存。
  - 分類：新增 / 編輯 / 刪除。
  - 標籤：新增 / 編輯 / 刪除。
  - 預算：啟用 / 設定 / 分配 / 信用卡撥備 / 搬錢 / 目標 upsert / 目標刪除 / 自動分配。
- `safeSnapshot`：audit 快照擷取也**永不中斷主流程**（toJSON 缺失/丟錯退回原值）。
- 讀取 API `GET /api/audit-logs`（分頁、可依 entityType / action / entityId 篩選）。
- 前端 `(main)/audit-logs` 變更歷史檢視（時間軸、動作/類型篩選含全 6 類、UPDATE 欄位級 diff、快照展開、分頁）。
- 本地 sharded cluster（Docker）+ 初始化腳本 + 合成資料 seed 腳本，供分片實驗。

### 2.2 v1 不做（schema / enum 已預留）
- ❌ 分期（installment）**每期展開交易**逐筆 audit → 僅以 InstallmentPlan 記一筆 CREATE。
- ❌ audit 的 update / delete（append-only，A7）。
- ❌ IP / userAgent 記錄（service 層多無 `req`；要記需把 request context 往下傳）。
- ❌ TTL 自動過期（A7 保留設計，v1 不設，讓資料持續累積有利分片觀察）。

---

## 3. 設計決策（A1–A9，使用者已拍板，不可自行更改）

### A1 — 儲存於 MongoDB 專用連線（而非 PostgreSQL / 主 Mongo）
audit log 是本功能的**水平擴展練習主體**，故存 MongoDB 並用**獨立連線** `AUDIT_MONGODB_URL` 指向本地 sharded cluster；主 Mongo（Atlas）維持承載 KnowledgeChunk/Announcement。
代價：與 PG 帳本是 **dual-write**（audit 在 PG commit 後才寫，PG 已 commit 不會回滾）→ 由 A4 的 best-effort 語意承接（audit 漏記可接受，遠優於 audit 失敗害使用者交易失敗）。

### A2 — shard key = `{ userId: 1, createdAt: 1 }`（compound ranged）
這是 per-user 時序 append 資料的教科書解。候選比較：

| Shard key | 寫入分佈 | 單一大用戶可再切分 | 按 userId 查詢 | 結論 |
| --- | --- | --- | --- | --- |
| `{ _id: 1 }`（ObjectId, ranged） | ❌ 單 shard 熱點（單調遞增→恆寫 MaxKey chunk） | — | scatter | 反面教材 |
| `{ createdAt: 1 }` | ❌ 同上，時間恆增 | — | scatter | 反面教材 |
| `{ userId: 1 }` | ⚠️ 視分佈 | ❌ power user → jumbo chunk | ✅ targeted | 不夠 |
| `{ userId: "hashed" }` | ✅ 最均勻、最簡單 | ❌ 單用戶仍進單 shard | ✅ targeted | 次選 |
| **`{ userId: 1, createdAt: 1 }`** | ✅ 高位 userId→跨用戶分散 | ✅ 用 createdAt 切到多 shard | ✅ targeted（前綴）；加時間範圍更精準 | **採用** |

### A3 — 攔截機制 = service 層顯式 `recordAudit`（而非 Sequelize hook）
在每個 mutation service **commit 之後**顯式呼叫。理由：① 手邊就有 `userId`；② 能擷取 before/after 與精準語意（拆分/標籤的「先刪後建」視為一次 UPDATE，不爆雜訊）；③ 寫入發生在 commit 後，避開 hook 內跨庫寫的 rollback 風險。代價：要在各 mutation 補 call site（v1 僅交易四處）。

### A4 — best-effort、commit 後 fire-and-forget
`void recordAudit(...)`：不 await、不阻塞回應；`recordAudit` 內 try/catch 吞例外只記 log；`NODE_ENV=test` 或 audit 連線未就緒（`isAuditReady()` false）時直接 return。**audit 失敗永不影響主流程**。

### A5 — 範圍：全部 mutation 入口
交易（含 transfer 與 updateTransfer；分期以 plan 記一筆）、帳戶、分類、標籤、預算全部接線（見 §2.1、§5）。交易/帳戶/分類/標籤帶完整 before/after 快照與 diff；預算在 controller 層接線、`after` = 操作參數（無 before/after diff，因 controller 無 before-state，且 YNAB 式分配高頻、輕量化即可）。

### A6 — 記錄粒度：完整快照 + UPDATE 欄位級 diff
存 `before` / `after` 完整 `toJSON()` 快照（經 `safeSnapshot`）；UPDATE 另由後端 `computeChanges()` 算 top-level 欄位 diff（忽略 `updatedAt/createdAt/deletedAt` 雜訊），前端直接顯示「from → to」。

### A7 — append-only
audit 永不更新 / 刪除既有紀錄。TTL 過期保留設計但 v1 不啟用。

### A8 — 讀取 API + 前端
`GET /api/audit-logs`（authMiddleware、offset 分頁、`limit` 封頂 `AUDIT_LOG_MAX_PAGE_SIZE=100`、預設 20、可選 `entityType/action/entityId` 篩選）。前端時間軸檢視。

### A9 — 已知殘留缺口（明列、不假裝覆蓋）
A9 原列的 updateTransfer / Account / Category / Tag / Budget 已全部補齊（見 §2.1）。**僅剩**：分期每期展開交易的逐筆 audit（僅記 plan 一筆）、IP / userAgent。後續可比照 recordAudit 模式補上。

---

## 4. 資料模型（`auditlogs` collection）

`src/models/auditLog.ts`（Mongoose，綁在 `auditConnection`）：

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `userId` | String, required | **shard key 高位**。每筆必帶 → 跨用戶均勻分散 |
| `action` | enum CREATE/UPDATE/DELETE | |
| `entityType` | enum TRANSACTION/TRANSFER/… | |
| `entityId` | String, required | 被變更實體的 PK（交易 id / InstallmentPlan id） |
| `summary` | String \| null | 人類可讀摘要，例「新增支出 $1,200・午餐」 |
| `before` | Mixed \| null | 變更前快照（CREATE 為 null） |
| `after` | Mixed \| null | 變更後快照（DELETE 為 null） |
| `changes` | `{field,from,to}[]` | UPDATE 的欄位級 diff（其餘為 `[]`） |
| `createdAt` | Date（應用層帶入） | **shard key 低位**。`timestamps:false`，由 app 設值（seed 可回填歷史時間） |

**索引**：
- `{ userId: 1, createdAt: 1 }` — shard key 對應索引；同時服務「某用戶時間軸」feed（`sort({createdAt:-1})` 走反向掃描）。
- `{ userId: 1, entityType: 1, entityId: 1, createdAt: -1 }` — 單筆實體完整變更歷史。

---

## 5. 寫入流程（接線點）

一律在該 mutation 的 PG transaction commit / `simplifyTransaction` resolve **之後** `void recordAudit(...)`。

| 入口（檔案） | action | entityType | entityId | before / after |
| --- | --- | --- | --- | --- |
| `createTransaction` 一般（transactionServices） | CREATE | TRANSACTION | 交易 id | after = 交易快照 |
| `createTransaction` 分期 | CREATE | TRANSACTION | InstallmentPlan id | after = 分期摘要 |
| `updateIncomeExpense` | UPDATE | TRANSACTION | 交易 id | before（mutation 前快照）/ after + diff |
| `deleteTransaction` | DELETE | TRANSACTION | 交易 id | before = 被刪交易快照 |
| `createTransfer` | CREATE | TRANSFER | from leg id | after = `{from,to}` |
| `updateTransfer` | UPDATE | TRANSFER | from leg id | before/after = from leg + diff |
| 帳戶 新增/編輯/刪除/封存/解除封存（accountController） | CREATE/UPDATE/DELETE | ACCOUNT | account id | 快照（封存僅 `{isArchived}`） |
| 分類 新增/編輯/刪除（categoryController） | CREATE/UPDATE/DELETE | CATEGORY | category id | 快照 + diff |
| 標籤 新增/編輯/刪除（tagServices） | CREATE/UPDATE/DELETE | TAG | tag id | 快照 + diff（冪等命中不記） |
| 預算 啟用/設定/分配/CC撥備/搬錢/目標/自動分配（budgetController） | CREATE/UPDATE/DELETE | BUDGET | userId / `month:cat` / `target:cat` 等 | after = 操作參數 |

`recordAudit`／`computeChanges`／`listAuditLogs`／`genericAuditSummary`／`safeSnapshot` 在 `src/services/auditLogService.ts`。

---

## 6. 叢集拓撲（本地練習）

`apps/backend/docker/mongo-shard/`（詳見該目錄 README）：

```
mongos (router, :27017)  ← app / seed 連這裡（AUDIT_MONGODB_URL）
 ├─ config server RS  cfgrs    (:27019)
 ├─ shard1 RS         shard1rs (:27018)
 └─ shard2 RS         shard2rs (:27028)
```

啟動：`docker compose -f docker/mongo-shard/docker-compose.yml up -d` → `./docker/mongo-shard/init-cluster.sh`（初始化 RS、加 shard、設 chunksize=1MB、對 `easyaccounting_audit.auditlogs` 開分片）。

---

## 7. 實驗步驟（這才是練習的重點）

1. 起 cluster + init（§6）。
2. `pnpm tsx src/utils/seedAuditLog.ts 200000 500` 灌 20 萬筆 / 500 使用者（chunksize=1MB 下足以逼出多 chunk 跨 shard）。
3. 連 mongos 觀察：
   - `sh.status()` — chunk 在 shard 間的分佈。
   - `db.auditlogs.getShardDistribution()` — 各 shard 資料量是否均勻。
   - `db.auditlogs.find({ userId: '...' }).explain('executionStats')` — **targeted**（單 shard `SHARD_MERGE` 只命中一個）。
   - `db.auditlogs.find({ action: 'DELETE' }).explain(...)` — **scatter-gather**（廣播所有 shard）。
4. **對照實驗（學習產出）**：另開一個 collection 用爛 shard key（`{_id:1}` 或 `{createdAt:1}`）灌同樣資料，比較 `sh.status()` 是否全擠單一 shard（寫入熱點），驗證 A2 的選擇。
5. 觀察 balancer：持續灌資料時 `sh.status()` 看 chunk 分裂與在 shard 間搬移。

---

## 8. 測試

- `tests/unit/auditLog_service.test.ts` — `computeChanges` 純函式（6 cases：欄位 diff、忽略雜訊、巢狀相等、null 邊界、單邊欄位）。
- `tests/unit/auditLog_record.test.ts` — `recordAudit`（mock model + 連線就緒）：UPDATE 帶 diff、CREATE before=null、**best-effort**（未就緒/丟錯不影響呼叫端）、test 環境略過；`listAuditLogs`（filter / 分頁 skip / `_id→id` / ISO 映射）；`genericAuditSummary`。
- `tests/unit/auditLog_wiring.test.ts` — 接線驗證：tagServices 建立後發 CREATE/TAG audit、冪等命中不發。
- audit 寫入在 `NODE_ENV=test` 略過（A4），`safeSnapshot` 確保快照擷取永不 throw → 既有單元（165）+ 整合（tagFlow/budgetFlow 29）測試全綠、無需連 Mongo。

---

## 9. 進度追蹤

- [x] Shared：`AuditAction`/`AuditEntityType` enum、`listAuditLogsQuerySchema`、`AuditLogType` 等型別。
- [x] 後端：`auditMongo` 專用連線、`AuditLog` model（shard key 索引）、`auditLogService`（recordAudit/listAuditLogs/computeChanges）、controller、route、app.ts 掛載 + 啟動連線。
- [x] 接線：**全部 mutation 入口**（交易五處 + 帳戶 + 分類 + 標籤 + 預算）commit 後 best-effort 發 audit。
- [x] `safeSnapshot`：audit 快照擷取永不中斷主流程。
- [x] 本地 sharded cluster：docker-compose + init-cluster（sh）+ init-cluster（js）+ README。
- [x] seed 腳本：`seedAuditLog.ts`。
- [x] 前端：`auditLog` service、`(main)/audit-logs` 頁、`AuditLogPanel`（6 類篩選）、sidebar 導覽。
- [x] 測試：`computeChanges` / `recordAudit` / `listAuditLogs` / `genericAuditSummary` / 接線（18 cases）；既有 165 unit + 29 integration 全綠。
- [ ] （後續）分期每期逐筆 audit、IP/userAgent（A9 殘留）。
- [ ] （後續）TTL / 生產分片升級評估。
