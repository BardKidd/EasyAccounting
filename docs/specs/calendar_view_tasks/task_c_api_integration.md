# Task C: 前端串接實際 API

> 將前端從 MSW mock 切換到實際後端 API。

---

## 前置條件

- ✅ Task A 完成（前端元件使用 MSW）
- ✅ Task B 完成（後端 API 調整）

---

## 目標

移除 MSW mock，讓前端直接呼叫後端 API，驗證端對端功能正常。

---

## 參考文檔

| 文檔                 | 路徑                                                                                                              | 說明              |
| -------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------- |
| **主規格書**         | [calendar_view_spec.md](file:///Users/rinouo/Frontend/Projects/EasyAccounting/docs/specs/calendar_view_spec.md)   | API 規格參考      |
| **前端 API Service** | [transaction.ts](file:///Users/rinouo/Frontend/Projects/EasyAccounting/apps/frontend/src/services/transaction.ts) | 現有 API 呼叫方式 |
| **Task A 產出**      | `transactionCalendar.tsx` 等元件                                                                                  | 需確認 API 呼叫點 |

---

## 工作項目

### 1. 停用 MSW Handler

```typescript
// apps/frontend/src/mocks/handlers/calendar.ts
// 註解或移除日曆相關的 mock handler
```

或在環境變數控制：

```typescript
if (process.env.NODE_ENV === 'development' && !process.env.USE_REAL_API) {
  // 啟用 MSW
}
```

### 2. 確認 API Response 格式

比對 MSW mock 和實際 API response：

| 欄位              | Mock           | 實際 API    | 需調整？ |
| ----------------- | -------------- | ----------- | -------- |
| `id`              | string         | string      | -        |
| `date`            | YYYY-MM-DD     | YYYY-MM-DD  | -        |
| `time`            | HH:mm:ss       | HH:mm:ss    | -        |
| `type`            | INCOME/EXPENSE | 確認大小寫  | 可能     |
| `linkId`          | string/null    | string/null | -        |
| `targetAccountId` | string/null    | string/null | -        |

### 3. 處理 Error Cases

MSW 通常不會失敗，但實際 API 會。確認：

- [ ] 401 Unauthorized 處理（token 過期）
- [ ] 400 Bad Request 處理（拖放到無效日期）
- [ ] 500 Server Error 處理
- [ ] 網路錯誤處理

### 4. 測試拖放連動

驗證操作類交易拖放時，後端正確連動更新：

1. 建立一筆轉帳（產生 2 筆 linked transactions）
2. 在日曆拖放扣款方到新日期
3. 確認收款方的日期也同步更新

---

## 驗收標準

- [ ] 日曆從真實 API 載入交易資料
- [ ] 拖放更新日期成功寫入 DB
- [ ] 操作類交易拖放時，linked transaction 同步更新
- [ ] Error handling 正確顯示錯誤訊息

---

## 注意事項

- 如果 API response 格式與 mock 不同，優先調整前端（因為 mock 應該模擬真實 API）
- 如果發現 API bug，回報給 Task B 負責人修復
