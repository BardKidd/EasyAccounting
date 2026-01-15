# Email Notification Specification

## 1. 系統架構 (System Architecture)

- **排程管理**: 使用 `node-cron` 進行排程控制。
- **郵件服務**: 使用 `Resend` API 發送郵件。
- **模板渲染**: 使用 `@react-email/components` 進行 React 模板渲染。
- **圖表生成**: 部分報表使用 `QuickChart` 生成靜態圖表圖片嵌入郵件中。

## 2. 使用者偏好設定 (User Preferences)

- **資料表**: `personnel_notification`
- **關聯**: `userId` (One-to-One with User)
- **觸發時機**: 使用者註冊成功後，自動建立此表資料。
- **預設值**:
  - `dailyReminder`: `false`
  - `weeklySummaryNotice`: `false`
  - `monthlyAnalysisNotice`: `true` (預設開啟)

### Schema (Reference)

| Column Name             | Type    | Default | Description         |
| :---------------------- | :------ | :------ | :------------------ |
| `id`                    | UUID    | UUIDV4  | Primary Key         |
| `userId`                | UUID    | -       | Foreign Key to User |
| `dailyReminder`         | BOOLEAN | `false` | 每日記帳提醒開關    |
| `weeklySummaryNotice`   | BOOLEAN | `false` | 每週收支摘要開關    |
| `monthlyAnalysisNotice` | BOOLEAN | `true`  | 每月財務報表開關    |

## 3. 信件類型與排程 (Email Types & Schedules)

### 3.1. 註冊歡迎信 (Welcome Email)

- **觸發時機**: 使用者完成註冊 API 呼叫後立即發送 (Event-driven)。
- **接收者**: 新註冊的使用者。
- **檢查設定**: 無 (強制發送)。
- **所需資料**:
  - `userName`: 使用者名稱。

### 3.2. 每日記帳提醒 (Daily Reminder)

- **排程時間**: 每天晚上 **21:00** (9:00 PM)。
- **Cron Expression**: `0 21 * * *`
- **檢查設定**: `dailyReminder === true`
- **所需資料**:
  - `userName`: 使用者名稱。

### 3.3. 每週收支摘要 (Weekly Summary)

- **排程時間**: 每週一早上 **09:00** (9:00 AM)。
- **Cron Expression**: `0 9 * * 1` (Monday)
- **統計範圍**: 上週一 00:00 至 上週日 23:59。
- **檢查設定**: `weeklySummaryNotice === true`
- **所需資料**:
  - `userName`: 使用者名稱。
  - `startDate`: 統計開始日期 (e.g., "2025/12/22")。
  - `endDate`: 統計結束日期 (e.g., "2025/12/28")。
  - `expenseSummaryData`: 用於產圓餅圖的支出數據。
    - `labels`: 類別名稱陣列。
    - `datasets`: 對應金額陣列。
    - `doughnutlabel`: 總支出金額。
  - `incomeSummaryData`: 用於產圓餅圖的收入數據。
    - `labels`: 類別名稱陣列。
    - `datasets`: 對應金額陣列。
    - `doughnutlabel`: 總收入金額。

### 3.4. 每月財務報表 (Monthly Analysis)

- **排程時間**: 每個月 **5號** 早上 **09:00** (9:00 AM)。
- **Cron Expression**: `0 9 5 * *`
- **統計範圍**: 上個月 1號 00:00 至 上個月月底 23:59。
- **檢查設定**: `monthlyAnalysisNotice === true`
- **所需資料**:
  - `userName`: 使用者名稱。
  - `yearString`: 年份 (e.g., "2025")。
  - `twoMonths`: 比較月份名稱陣列 (e.g., ["十二月", "一月"])，用於趨勢圖 X 軸。
  - `summary`: 上月摘要。
    - `income`: 總收入。
    - `expense`: 總支出。
    - `balance`: 淨值 (Income - Expense)。
  - `balanceTrend`: 淨值趨勢 (與上上個月比較)。
    - `lastLastMonthBalance`: 上上個月結餘。
    - `lastMonthBalance`: 上個月結餘。
    - `totalChangeAmount`: 變動金額。
    - `totalChangePercent`: 變動百分比。
  - `topExpenses`: 前三大支出類別 (Pie Chart)。
    - `labels`: 類別名稱。
    - `data`: 金額。
    - `colors`: 圖表顏色。
    - `maxTransaction`: 上月最大筆單筆消費 (標題、金額、日期)。
  - `expenseComparison`: 支出類別比較 (與上上個月)。
    - `newCategories`: 新增的支出類別。
    - `increasedCategories`: 支出金額增長的類別 (名稱、金額、漲幅)。
  - `incomeComparison`: 收入類別比較。
    - `newCategories`: 新增的收入來源。
    - `increasedCategories`: 收入金額增長的類別。

## 4. 實作細節與邏輯

### 4.1. 批次處理

由於發信可能耗時，且受限於 Resend Rate Limit (e.g., 2 req/sec) 或 API 配額，應採取以下策略：

- **Batch Processing**: 撈取符合條件的使用者清單後，分批處理或使用 Queue 機制。
- **Rate Limiting**: 在迴圈中適當 `await` 或使用 `p-limit` 控制並發請求數。
- **發送延遲**: 目前階段可接受因 Rate Limit 導致的發送延遲 (e.g. 尾端使用者較晚收到)，暫不需複雜的高併發架構，待使用者規模擴大後再行優化。

### 4.2. 錯誤處理

- 若單一使用者的報表生成失敗 (e.g., QuickChart timeout, 資料庫 timeout)，應記錄 Error Log 但**不應中斷**其他使用者的發信流程。

### 4.3. 時區

- 注意 Server 時區與使用者預期時區。目前規格假設為 Server 本地時間或 UTC+8 (需與 `node-cron` 設定一致)。

## 5. 測試策略 (Test Strategy)

- **單元測試 (Unit Tests)**:
  - 針對 React Email Component 進行渲染測試，確保傳入假資料能正確產出 HTML。
  - 針對資料撈取邏輯 (Service Layer) 測試，確保日期範圍計算正確 (上週、上月)。
- **整合測試 (Integration Tests)**:
  - 模擬 `personnel_notification` 設定，觸發 Cron Job (或直接呼叫 Job Function)。
  - 驗證是否只有 `true` 的使用者被呼叫 Resend API。
  - 使用 Mock Server 攔截 Resend API call，驗證發出的 Body 內容。
