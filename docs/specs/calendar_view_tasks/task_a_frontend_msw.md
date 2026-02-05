# Task A: 前端日曆視圖建立 (MSW Mock)

> 使用 MSW 模擬 API，建立完整的日曆視圖前端功能。

---

## 目標

建立日曆視圖的所有前端元件和邏輯，使用 MSW mock API 進行開發，確保與後端 API 規格一致。

---

## 參考文檔

| 文檔                 | 路徑                                                                                                                                               | 說明                           |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| **主規格書**         | [calendar_view_spec.md](file:///Users/rinouo/Frontend/Projects/EasyAccounting/docs/specs/calendar_view_spec.md)                                    | 完整功能規格                   |
| **交易規格**         | [transaction_spec.md](file:///Users/rinouo/Frontend/Projects/EasyAccounting/docs/specs/transaction_spec.md)                                        | Transaction schema 和 API 定義 |
| **現有交易表格**     | [transactionTable.tsx](file:///Users/rinouo/Frontend/Projects/EasyAccounting/apps/frontend/src/components/transactions/transactionTable.tsx)       | 參考顏色定義和轉帳判斷邏輯     |
| **交易編輯 Sheet**   | [newTransactionSheet.tsx](file:///Users/rinouo/Frontend/Projects/EasyAccounting/apps/frontend/src/components/transactions/newTransactionSheet.tsx) | 點擊交易時複用此元件           |
| **前端 API Service** | [transaction.ts](file:///Users/rinouo/Frontend/Projects/EasyAccounting/apps/frontend/src/services/transaction.ts)                                  | 現有 API 呼叫方式              |

---

## 工作項目

### 1. 套件安裝

```bash
pnpm add react-big-calendar date-fns @tanstack/react-virtual
pnpm add -D @types/react-big-calendar
```

### 2. 建立元件

在 `apps/frontend/src/components/transactions/` 下新增：

| 檔案                      | 說明                                                                 |
| ------------------------- | -------------------------------------------------------------------- |
| `transactionCalendar.tsx` | 日曆主元件，包含 `transactionToCalendarEvent` 轉換邏輯               |
| `calendarEvent.tsx`       | 單筆事件渲染，處理顏色（收入綠/支出紅/操作橙黃）                     |
| `calendarDayModal.tsx`    | 點擊日期的 Modal，使用 `@tanstack/react-virtual` 實作 virtual scroll |
| `calendarToolbar.tsx`     | （可選）自訂工具列                                                   |

### 3. 頁面整合

修改交易頁面，新增 Tab 切換：

- 找到交易列表頁面（可能在 `pages/` 或使用 routing）
- 新增「列表」/「日曆」Tab
- 切換時保留當前月份 context

### 4. MSW Mock Handler

建立 MSW handler 模擬：

```typescript
// 建議位置：apps/frontend/src/mocks/handlers/calendar.ts

// GET /transactions - 回傳當月交易（不分頁）
// 需包含操作類交易 mock data:
// - 有 linkId 和 targetAccountId 的交易
// - 扣款方（type: EXPENSE）和收款方（type: INCOME）

// PUT /transactions/:id - 模擬拖放更新
// 回傳更新後的交易
```

**Mock Data 要點**：

- 包含一般收入/支出交易
- 包含操作類交易（轉帳），帶 `linkId` 和 `targetAccountId`
- 確保有某天超過 2 筆交易（測試 `+N more` 顯示）

### 5. 核心邏輯

#### 5.1 Transaction 轉 CalendarEvent

參考 spec 第 149-176 行：

```typescript
interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  type: RootType;
  amount: number;
  isTransfer: boolean;
}

function transactionToCalendarEvent(tx: TransactionType): CalendarEvent {
  const dateTime = new Date(`${tx.date}T${tx.time}Z`);
  return {
    id: tx.id,
    title: tx.description || formatAmount(tx.amount, tx.type),
    start: dateTime,
    end: dateTime,
    allDay: false,
    type: tx.type,
    amount: tx.amount,
    isTransfer: tx.linkId !== null,
  };
}
```

#### 5.2 篩選操作類交易

日曆只顯示扣款方（避免轉帳顯示兩次）：

```typescript
// 前端篩選（如果後端沒處理）
const calendarEvents = transactions
  .filter((tx) => !(tx.targetAccountId && tx.type === 'INCOME'))
  .map(transactionToCalendarEvent);
```

#### 5.3 拖放

- 使用 React Big Calendar 內建的 `onEventDrop`
- 呼叫 `PUT /transactions/:id` 更新 `date`
- 顯示 loading 和 success/error toast

---

## 驗收標準

- [ ] 日曆正確顯示交易，按日期分布
- [ ] 每格最多顯示 2 筆，超過顯示 `+N more`
- [ ] 收入綠色、支出紅色、操作橙黃色
- [ ] 操作類交易只顯示扣款方
- [ ] 點擊日期開啟 Modal，顯示當日所有交易
- [ ] 點擊單筆交易開啟編輯 Sheet
- [ ] 拖放可調整日期（呼叫 mock API）
- [ ] Tab 可切換列表/日曆視圖

---

## 注意事項

- MSW mock 的 response 格式需與真實 API 完全一致（參考 `transaction_spec.md`）
- 時區處理：使用 `new Date(\
`