# Calendar View Code Review 導覽

快速閱讀日曆功能前後端程式碼的建議順序。

---

## 📋 規格文件（先讀）

| 檔案                                                                                                            | 說明                               |
| --------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| [calendar_view_spec.md](file:///Users/rinouo/Frontend/Projects/EasyAccounting/docs/specs/calendar_view_spec.md) | 完整規格：需求、設計決策、顏色規範 |

---

## 🖥️ Frontend

### 1. 進入點 & 頁面

| 檔案                                                                                                                                      | 重點                                          |
| ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| [transactions/page.tsx](<file:///Users/rinouo/Frontend/Projects/EasyAccounting/apps/frontend/src/app/(main)/transactions/page.tsx>)       | 資料 fetch、Tab 切換（列表/日曆）、傳入 props |
| [transactions/loading.tsx](<file:///Users/rinouo/Frontend/Projects/EasyAccounting/apps/frontend/src/app/(main)/transactions/loading.tsx>) | Skeleton 日曆樣式                             |

### 2. 核心元件

| 檔案                                                                                                                                                 | 重點                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| [transactionCalendar.tsx](file:///Users/rinouo/Frontend/Projects/EasyAccounting/apps/frontend/src/components/transactions/transactionCalendar.tsx)   | 主日曆元件：`react-big-calendar` + DnD 整合、事件處理 |
| [calendarEvent.tsx](file:///Users/rinouo/Frontend/Projects/EasyAccounting/apps/frontend/src/components/transactions/calendarEvent.tsx)               | 單一事件渲染（顏色、icon、金額）                      |
| [calendarDayModal.tsx](file:///Users/rinouo/Frontend/Projects/EasyAccounting/apps/frontend/src/components/transactions/calendarDayModal.tsx)         | 點擊日期的 Modal（交易列表、摘要）                    |
| [editTransactionSheet.tsx](file:///Users/rinouo/Frontend/Projects/EasyAccounting/apps/frontend/src/components/transactions/editTransactionSheet.tsx) | 編輯/刪除交易 Sheet                                   |

### 3. 工具函式

| 檔案                                                                                                                     | 重點                                                               |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| [calendarUtils.ts](file:///Users/rinouo/Frontend/Projects/EasyAccounting/apps/frontend/src/lib/calendarUtils.ts)         | `transactionToCalendarEvent`、`filterForCalendar`、`getEventColor` |
| [transactionColors.ts](file:///Users/rinouo/Frontend/Projects/EasyAccounting/apps/frontend/src/lib/transactionColors.ts) | 統一顏色常數（income/expense/transfer）                            |

### 4. API 呼叫

| 檔案                                                                                                                       | 重點                                          |
| -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| [services/transaction.ts](file:///Users/rinouo/Frontend/Projects/EasyAccounting/apps/frontend/src/services/transaction.ts) | `updateTransaction`（含 linked 交易日期同步） |

---

## ⚙️ Backend

### 1. API Routes

| 檔案                                                                                                                              | 重點                             |
| --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| [routes/transactionRoutes.ts](file:///Users/rinouo/Frontend/Projects/EasyAccounting/apps/backend/src/routes/transactionRoutes.ts) | `PUT /transactions/:id` 路由定義 |

### 2. Service 層

| 檔案                                                                                                                                               | 重點                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| [services/transactionServices.ts](file:///Users/rinouo/Frontend/Projects/EasyAccounting/apps/backend/src/services/transactionServices.ts#L200-300) | `updateTransaction`：linked 交易處理、日期範圍查詢 |

### 3. Model

| 檔案                                                                                                                  | 重點                       |
| --------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| [models/transaction.ts](file:///Users/rinouo/Frontend/Projects/EasyAccounting/apps/backend/src/models/transaction.ts) | `linkedTransactionId` 欄位 |

---

## 🔍 Review 重點

1. **Drag & Drop 更新流程**
   - `transactionCalendar.tsx` → `onEventDrop` → `updateTransaction` API
   - 確認 linked 交易日期是否同步更新

2. **顏色一致性**
   - 所有元件是否都使用 `TRANSACTION_COLORS` 常數
   - 檢查 `calendarEvent`、`calendarDayModal`、`editTransactionSheet`

3. **Modal 資料正確性**
   - `calendarDayModal` 的 `findCategory` 遞迴搜尋
   - `summary` 金額計算使用 `Number(tx.amount)`

4. **效能考量**
   - 少於 50 筆不用 virtual scroll（避免動畫問題）
   - 日期過濾在 API 層處理

---

## 📁 檔案樹狀結構

```
apps/frontend/src/
├── app/(main)/transactions/
│   ├── page.tsx          ← 進入點
│   └── loading.tsx       ← Loading skeleton
├── components/transactions/
│   ├── transactionCalendar.tsx   ← 主日曆
│   ├── calendarEvent.tsx         ← 事件渲染
│   ├── calendarDayModal.tsx      ← 日期 Modal
│   └── editTransactionSheet.tsx  ← 編輯 Sheet
├── lib/
│   ├── calendarUtils.ts          ← 轉換工具
│   └── transactionColors.ts      ← 顏色常數
└── services/
    └── transaction.ts            ← API 呼叫

apps/backend/src/
├── routes/transactionRoutes.ts
├── services/transactionServices.ts
└── models/transaction.ts
```
