# Recurring Transactions Engine Proposal

## 1. Overview & Goals

「週期性交易引擎」旨在幫助使用者自動記錄固定發生的收支（例如：每月訂閱費、房租、薪水），減少手動記帳的負擔，並確保記帳資料不會遺漏。
本功能將提供：

- 設定每月、每週或每年的固定交易。
- 設定重複次數或選擇無限次。
- 聰明的邊界日期推算（月底無該日自動前推）。
- 編輯單一週期產生的交易，或是一次修改整個週期的未來交易。

## 2. Database Schema Design

為了支援週期性交易，我們需要在不破壞現有 `Transaction` 結構的前提下，額外建立一張用來儲存「週期性交易樣板」的表。當週期條件滿足時（或是使用者建單時），系統會以這張表的資料為基底，產生實際的 `Transaction`。

### 新增資料表：`RecurringTransactionTemplate`

這張表的作用如同信用卡的「分期主檔」，用來記錄週期的規則。

| 欄位名稱                  | 型別                 | 說明                                                                                                                                                                                                                                  |
| ------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                      | UUID (PK)            | 主鍵                                                                                                                                                                                                                                  |
| `userId`                  | UUID (FK)            | 關聯使用者                                                                                                                                                                                                                            |
| `frequency`               | ENUM                 | 週期的頻率：`WEEKLY`, `MONTHLY`, `YEARLY`。                                                                                                                                                                                           |
| `dayOfMonth`              | INTEGER (nullable)   | `MONTHLY` 專用。使用者原始設定的「幾號」(1–31)，用於月底邊界推算時還原原始日期，避免截斷漂移（例如 1/31 → 2/28 → 3/28）。                                                                                                             |
| `dayOfWeek`               | INTEGER (nullable)   | `WEEKLY` 專用。使用者原始設定的「星期幾」(0=日, 1=一, …, 6=六)。                                                                                                                                                                      |
| `monthDay`                | STRING(5) (nullable) | `YEARLY` 專用。使用者原始設定的「MM-DD」，用於跨年推算（例如 `"02-29"`）。                                                                                                                                                            |
| `totalOccurrences`        | INTEGER (nullable)   | 總共應該發生的次數。`null` 代表無限次。                                                                                                                                                                                               |
| `currentOccurrence`       | INTEGER              | 目前已經產生了幾筆，預設 `0`。                                                                                                                                                                                                        |
| `nextExecutionDate`       | DATEONLY             | 下一次應該要產生的日期。每日 Cron Job 會拿這個日期跟「今天」比對。                                                                                                                                                                    |
| `baseTransactionAttrs`    | JSONB                | 存放產生新交易時需要的基礎資料（如 `accountId`, `categoryId`, `amount`, `type`, `description`, `receipt`, `paymentFrequency`, `extraAdd`, `extraAddLabel`, `extraMinus`, `extraMinusLabel` 等），這樣就不必每次都去 copy 第一筆交易。 |
| `status`                  | ENUM                 | 狀態：`ACTIVE` (運行中), `COMPLETED` (已達總次數), `ARCHIVED` (使用者封存/帳戶封存)。                                                                                                                                                 |
| `createdAt` / `updatedAt` | TIMESTAMP            | 系統時間紀錄                                                                                                                                                                                                                          |

> **刪除策略**：使用者刪除週期規則時採用**硬刪除**（直接從資料庫移除該筆 Template），不使用軟刪除。已有獨立的「暫停（ARCHIVED）」功能供使用者保留規則但暫停執行。

### 修改現有資料表：`Transaction`

現有的 `Transaction` 只需要加上兩個選填的關聯欄位，讓單筆交易可以追溯回它的「週期主檔」，以及知道它是這個週期的第幾筆。

| 欄位名稱              | 型別                | 說明                                                                                         |
| --------------------- | ------------------- | -------------------------------------------------------------------------------------------- |
| `recurringTemplateId` | UUID (FK, Optional) | 關聯至 `RecurringTransactionTemplate.id`。如果這筆交易是由週期引擎產生的，這個欄位就會有值。 |
| `recurringSequence`   | INTEGER (Optional)  | 代表這是該週期的「第幾筆」。這樣在前端 UI 顯示「Spotify (3/12)」時非常方便。                 |

**為什麼選擇新增 Template 表，而不是直接擴充 Transaction？**
如果直接把所有的週期邏輯（總次數、下次執行時間、狀態）都塞進現有的 `Transaction`，會讓所有不需要週期的單次交易也多出一堆 `null` 欄位。而且，當使用者想要「編輯整個週期」時（例如把每月 Spotify 訂閱從 149 改成 169），我們只需要去修改這張 `Template` 表裡的 `baseTransactionAttrs.amount`，之後產生的交易就會自動是用新的金額。獨立成一張表是最清晰且擴充性最好的做法。

## 3. Transaction Generation Logic

根據討論，我們採用 **當天才建立** 的機制，以確保 `account.balance` 永遠反映實際發生的交易，而不是未來的預建金額。

### 時區說明

系統固定以 **UTC+8（台灣時間）** 為基準，資料庫存放的日期為無時區的純日期（`DATEONLY` / `yyyy-mm-dd`），不含 timezone 資訊。Cron Job 須設定於台灣時間凌晨 0 點執行，不支援多時區。

### 產生規則

**所有週期交易**（無論次數）均由 Cron Job 在 **`nextExecutionDate` 當天凌晨** 才建立實際的 `Transaction`，不做任何預先產生。使用者建立週期交易後只會看到一個 **預告區塊**（見 5.4），內存來自 `Template` 的資料，不是真正的 `Transaction` 記錄。

**優點**：

- `account.balance` 永遠反映今天拿到的實際金額，不會被未來交易影響。
- 架構簡單，所有週期交易都走同一套邏輯。

### Cron Job 執行邏輯（每日凌晨 UTC+8 0:00 執行）

1. 找出所有 `status = ACTIVE` 且 `nextExecutionDate <= 今天` 的 `Template`。
2. 根據 `baseTransactionAttrs` 建立一筆新的 `Transaction`，日期即為 `nextExecutionDate`。
3. `Template.currentOccurrence += 1`。
4. 計算並更新 `Template.nextExecutionDate` 到下一個週期。
5. 若 `currentOccurrence >= totalOccurrences`，將 `status` 設為 `COMPLETED`。
6. `Template` 更新與 `Transaction` 寫入必須在同一個 **DB Transaction** 中，確保原子性。

## 4. Edge Cases Handling

### 4.1 日期推算邏輯 (Date Math)

由於月份天數不同，我們採用「單純看日期，無該日期則推至該月最後一日」的策略：

- **設定為每月 31 號**：
  - 1月：1/31
  - 2月：2/28（若為閏年則為 2/29）
  - 4月：4/30
- **設定為每年 2 月 29 號**：
  - 2024 (閏年)：2/29
  - 2025 (平年)：2/28

### 4.2 遇假日的處理

維持簡單原則：**系統不特別處理假日**，該哪一天產生就哪一天產生。若使用者有特殊需求，需自行手動進去調整單筆交易的日期。

### 4.3 預算連動

目前維持現行架構，產生的 `Transaction` 如果落在該月份，就照常計算在當月收支內；預算系統暫不針對週期性交易做特殊預扣或隔離設計（待未來預算系統大改時再考慮）。

### 4.4 修改整個未來週期的資料一致性

由於週期交易均由 Cron Job 當天才建立，未來的 Transaction 目前不存在 DB 中，因此「修改整個未來週期」的資料一致性問題大幅簡化。

**實作方式**：

1. 操作的起點為使用者點選的那筆 Transaction，更新那筆的資料（判斷就是該筆的 `recurringTemplateId`）。
2. 更新 `Template.baseTransactionAttrs` 成新設定。
3. Cron Job 後續產生的交易會自動使用新的 `baseTransactionAttrs`，不需額外處理。
4. 上述操作被包裹在同一個 **DB Transaction** 中。

**注意**：選取那筆 Transaction 本身的日期加以修改，其前的歷史交易（`date < 選取那筆交易的日期`）不受影響。

### 4.5 帳戶刪除的連鎖處理

`baseTransactionAttrs` 中儲存了 `accountId`，若使用者刪除或封存帳戶，Cron Job 嘗試以已失效的 `accountId` 建立 Transaction 時會發生 FK constraint 錯誤。

**處理原則**：

- **硬刪除帳戶**：後端在刪除帳戶前，自動將所有 `baseTransactionAttrs.accountId` 吻合的 `ACTIVE` / `ARCHIVED` Template **一併硬刪除**。
- **封存帳戶（軟刪除）**：將相關 `ACTIVE` Template 設為 `ARCHIVED`，讓使用者之後可以選擇重新啟用或修改帳戶。

**Category 刪除**（暫緩）：目前 Category 為硬刪除、無封存機制，週期交易的 categoryId 失效風險暫時以「刪除分類時提示使用者有週期交易正在使用」的方式處理，待後續完善。

## 5. UI/UX Flow (Creation & Editing)

### 5.1 建立週期性交易 (Creation)

1. **觸發點**：在獨立的「週期性交易」頁面（`/recurring`），透過右上角的「新增週期事件」按鈕觸發 `TransactionSheet`（`mode="template"`）。
2. **操作流程**：
   - 使用者填寫基本的金額、分類、帳戶後，直接設定週期參數（不需要額外開關）。
   - 三個主要選項：
     - **頻率**：每月 / 每週 / 每年。
       - 若選「每月」，出現日期選擇器（1~31），預設帶入今天日期。下方提示：「若當月無該日期，將自動以該月最後一天計算」。
       - 若選「每週」，出現星期選擇器（日~六）。
       - 若選「每年」，出現月份下拉選單 + 日期數字輸入。若選 2/29，提示：「平年將以 2/28 代替」。
     - **結束條件**：
       - 單選題：`[無限次] / [指定次數]`
       - 若選指定次數，出現數字輸入框。
3. **注意**：一般的「新增交易」元件中不包含週期性交易功能，所有週期設定統一在 `/recurring` 頁面管理。

### 5.2 編輯與刪除 (Editing & Deletion)

當使用者點開一筆 **由週期引擎產生** 的交易（`Transaction` 帶有 `recurringTemplateId`）：

1. **編輯模式詢問**：
   - 點擊編輯或刪除時，彈出選項（類似 Google Calendar 的重複事件邏輯）：
     - **A. 僅修改/刪除此筆交易**：只影響當下的 `Transaction`，不會改動 `Template`，未來產生的依然照舊。
     - **B. 修改/刪除整個週期 (包含未來)**：
       - 若為修改：展開完整的「編輯交易」畫面。儲存後同時更新：
         1. 點選的那筆 Transaction 本身（致這筆的資料）。
         2. `Template.baseTransactionAttrs`，後續 Cron Job 產生的交易一律使用新設定。
         3. 選取這筆之前的歷史交易不受影響。
       - 若為刪除：刪除點選的那筆 Transaction，並**硬刪除** `Template`（從資料庫移除），後續不再產生。選取這筆之前的歷史交易不受影響。
       - ⚠️ **Confirm Dialog**：「此操作將更改此筆交易及往後所有週期交易的設定。」

### 5.3 單筆交易顯示

- 在交易列表中，這筆交易的 Icon 或標題旁，可以加上一個「🔁 小圖示」，或是顯示文字 `(1/12)`（利用 `recurringSequence` 與 `totalOccurrences`），讓使用者知道這是一筆週期性交易。

### 5.4 週期交易預告區塊 (Upcoming Preview)

由於週期交易在刻發生前不对內建立實際的 Transaction 記錄，前端需另外提供一個預告區塊，內容來自 `RecurringTransactionTemplate` 資料。

**顯示內容**：

- 週期交易的名稱、金額、額繖率和下次發生日期（來自 `Template.nextExecutionDate`）。
- 可以列出未來 N 天內將發生的所有週期交易清單（由前端根據 `Template.nextExecutionDate` 與 `frequency` 推算，不需新 API）。

**設計原則**：

- 此區塊是「預覽」，不是實際交易，不影響收支統計。
- 點擊預告項目可操作（暂停、修改、取消 Template），不可直接編輯預告的內容。

---

## 6. 帳戶封存功能規格

### 6.1 背景

目前帳戶刪除為直接 `Account.destroy()`（硬刪除），`isArchived` 欄位已存在但封存功能尚未完整實作。為了與週期交易的連鎖處理整合，此次一併完善。

### 6.2 兩種操作的定義

| 操作               | 行為                                                   | 對週期交易的影響                                           |
| ------------------ | ------------------------------------------------------ | ---------------------------------------------------------- |
| **封存（軟刪除）** | 設 `isArchived = true`，帳戶從一般列表消失，但資料保留 | 關聯的 `ACTIVE` Template 自動設為 `ARCHIVED`，並通知使用者 |
| **刪除（硬刪除）** | `Account.destroy()`，帳戶與所有底下交易紀錄永久刪除    | 關聯的 `ACTIVE` / `ARCHIVED` Template **一併硬刪除**       |

### 6.3 API 設計

- **`PATCH /accounts/:accountId/archive`**：將帳戶設為封存（`isArchived = true`），同時 PAUSE 關聯 Template。
- **`PATCH /accounts/:accountId/unarchive`**：解除封存（`isArchived = false`），但關聯 Template 需使用者手動重啟，不自動 RESUME。
- **`DELETE /accounts/:accountId`**：硬刪除，需在 confirm 步驟提示「底下的交易記錄與週期規則將一併被永久刪除」，後端同步硬刪除關聯 Template。

### 6.4 前端 UX

- 帳戶設定頁面提供「封存帳戶」和「刪除帳戶」兩個分開的選項。
- 刪除前顯示強確認 Dialog（需輸入帳戶名稱或點按兩次確認）。
- `getAccountsByUser` 預設不回傳封存帳戶；可通過 `?showArchived=true` 查詢，並在 UI 提供「顯示已封存帳戶」的切換開關。
