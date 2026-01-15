# Statistics API Specification

這份文件定義了 `Statistics` 模組 (統計報表) 的預期行為與測試規範。所有的統計數據皆為即時運算 (Real-time Calculation)，不依賴預先聚合的資料表。

## 1. 通用邏輯 (General Logic)

### 1-1. 日期處理

- **Input**: `startDate` 與 `endDate` 由前端傳入 (除了總資產趨勢圖)。
- **Scope**: 後端僅負責篩選該區間內的資料，不需處理週/月/年的週期切分 (前端處理)。

### 1-2. 交易類型判定 (Transaction Type Definition)

所有統計 API 涉及交易類型時，皆依循以下判定規則：

| 類型                    | 判定條件                                                                              |
| :---------------------- | :------------------------------------------------------------------------------------ |
| **收入 (Income)**       | `type` = `INCOME`                                                                     |
| **支出 (Expense)**      | `type` = `EXPENSE`                                                                    |
| **轉入 (Transfer In)**  | `type` = `INCOME` **AND** `linkId` IS NOT NULL **AND** `targetAccountId` IS NOT NULL  |
| **轉出 (Transfer Out)** | `type` = `EXPENSE` **AND** `linkId` IS NOT NULL **AND** `targetAccountId` IS NOT NULL |

---

## 2. 總資產趨勢 (Asset Trend)

- **Endpoint**: `GET /api/statistics/asset-trend`
  - **Note**: 目前程式碼可能為 POST，需修正為 GET。
- **特性**:
  - **Full Range**: 不接受 `startDate`/`endDate`，後端直接撈取 DB 中該 User 最小與最大交易日期作為區間。
  - **倒推法 (Backward Calculation)**:
    - 運算: 每個月的 `Net Flow` = `(該月收入 + 該月轉入) - (該月支出 + 該月轉出)`。
    - **手續費考量**: 轉入與轉出金額未必相等 (e.g. 跨行手續費)，因此**必須**包含轉帳金額的計算，不能假設互相抵銷。
    - 公式: `上月底資產` = `本月底資產` - `本月 Net Flow`。
    - **效能註記**: 由於資料量僅為每月一筆聚合結果 (10年約120筆)，倒推法的運算成本極低，無效能疑慮。

---

## 3. 總覽 Tab (Overview Tab)

### 3-1. 收支概況 (Overview Summary)

- **回傳項目**:
  1.  **收入**: 加總
  2.  **支出**: 加總
  3.  **轉入**: 加總
  4.  **轉出**: 加總
  5.  **結餘 (Balance)**: `(收入 + 轉入) - (支出 + 轉出)`。
      - **說明**: 必須包含轉帳項目以正確反映手續費等實際上對帳戶餘額的影響。

### 3-2. 支出類別 Top 3 (Top 3 Expense Categories)

- **Scope**: 僅 `EXPENSE` (排除 `Transfer Out`)。
- **Aggregation**: 需依據 **MainCategory** (主分類) 進行 `GROUP BY`。
  - 須將所有 SubCategory 的金額歸戶到其對應的 MainCategory。
- **Response**: MainCategory 名稱 + 總金額，取前三高。

### 3-3. 單筆支出 Top 3 (Top 3 Single Expenses)

- **Scope**: 僅 `EXPENSE` (排除 `Transfer Out`)。
- **Display**: 顯示 **SubCategory** (子分類) 名稱。
- **Logic**: 找出金額最大的三筆「單筆交易紀錄」。
- **Response**: Transaction info (Amount, Date, SubCategory Name).

---

## 4. 明細 Tab (Details Tab)

- **Content**: 該區間內所有 Transaction (收支 + 轉入轉出)。
- **Sorting**: **日期由近到遠 (DESC)**。
  - User 定義: "越接近該時間區間底部的排在越上面" (最新的在上面)。
- **Filtering**: 後端全部回傳，前端自行處理顯示。

---

## 5. 類別 Tab (Category Tab)

- **Content**: Transaction + Category Info.
- **Aggregation**: 依據 **MainCategory** 進行 `GROUP BY` 加總。
- **Sorting**: 總金額由大至小 (DESC)。
- **Scope**: 包含 收、支、轉入、轉出 (User: "收支轉入轉出資料")。

---

## 6. 排行 Tab (Ranking Tab)

- **Content**: Transaction + Category Info.
- **Aggregation**: 依據 **SubCategory** 進行 `GROUP BY` 加總。
  - **不需** 找出 Main Category。
- **Sorting**: 總金額由大至小 (DESC)。

---

## 7. 帳戶 Tab (Account Tab)

- **Content**: Transaction + Account Info.
- **Aggregation**: 依據 **Account** 進行 `GROUP BY` 加總。
- **Sorting**: 總金額由大至小 (DESC)。
- **Logic**: 顯示各個帳戶在該區間內的收支/轉帳流動總合。
