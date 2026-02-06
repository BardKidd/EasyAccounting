# Calendar View Tasks

> 日曆視圖功能的任務拆分，供多個 agent 平行作業。

---

## 任務總覽

| Task                                  | 名稱                 | 依賴    | 可平行 |
| ------------------------------------- | -------------------- | ------- | ------ |
| [Task A](./task_a_frontend_msw.md)    | 前端建立（MSW Mock） | -       | ✅     |
| [Task B](./task_b_backend_api.md)     | 後端 API 調整        | -       | ✅     |
| [Task C](./task_c_api_integration.md) | 前端串接實際 API     | A, B    | ❌     |
| [Task D](./task_d_testing.md)         | 測試                 | A, B, C | ❌     |

---

## 依賴關係

```
┌─────────┐     ┌─────────┐
│ Task A  │     │ Task B  │
│ 前端    │     │ 後端    │
│ (MSW)   │     │ (API)   │
└────┬────┘     └────┬────┘
     │               │
     └───────┬───────┘
             │
             ▼
       ┌─────────┐
       │ Task C  │
       │ API 串接 │
       └────┬────┘
            │
            ▼
       ┌─────────┐
       │ Task D  │
       │  測試   │
       └─────────┘
```

---

## 主要參考文檔

| 文檔                                              | 說明                           |
| ------------------------------------------------- | ------------------------------ |
| [calendar_view_spec.md](../calendar_view_spec.md) | 完整功能規格書                 |
| [transaction_spec.md](../transaction_spec.md)     | Transaction schema 和 API 定義 |
