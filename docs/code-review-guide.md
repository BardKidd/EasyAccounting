# Code Review 實戰指南

## 審查流程

```
Spec / Plan → 實作比對 → 逐層掃描 → 產出報告 → 修正追蹤
```

---

## 1. 準備階段

- [ ] 拿出原始 spec / plan / ticket，確認「預期行為」
- [ ] 釐清 scope：這次 PR 應該改哪些檔案、哪些層
- [ ] 先跑一次 build + test，確認 baseline 是綠的

## 2. 逐層掃描 Checklist

### 2.1 Schema / Types（共用層）

| 檢查項目             | 說明                                            |
| -------------------- | ----------------------------------------------- |
| 型別是否收緊         | `z.string()` vs `z.nativeEnum()` — 能限縮就限縮 |
| 欄位是否齊全         | spec 提到的欄位是否都在 schema 中               |
| optional vs required | 確認哪些欄位是必填、哪些可選                    |

### 2.2 後端 Model

| 檢查項目         | 說明                                |
| ---------------- | ----------------------------------- |
| 欄位型別對應     | DB 型別與 TS interface 是否一致     |
| FK / Association | `hasMany`, `belongsTo` 是否正確設定 |
| Hooks            | `afterDestroy` 等清理邏輯是否完整   |
| Migration        | 是否有對應的 migration 檔案         |

### 2.3 後端 Service

| 檢查項目          | 說明                                                        |
| ----------------- | ----------------------------------------------------------- |
| **SQL Injection** | 任何 `sequelize.literal()` 拼接使用者輸入 = 🔴              |
| DB Transaction    | 多步操作是否包在同一個 transaction                          |
| 餘額沖銷          | 金額修改時，舊金額有沒有正確 revert                         |
| 邊界處理          | null / undefined / 0 / 空字串的 edge case                   |
| 狀態機完整性      | 所有 status 的轉換是否合理（例：只有 ARCHIVED 才能 resume） |

### 2.4 後端 Controller & Route

| 檢查項目        | 說明                                   |
| --------------- | -------------------------------------- |
| 驗證 middleware | `validate(schema)` 是否掛上            |
| Auth middleware | 需要登入的路由是否有 `authMiddleware`  |
| HTTP method     | GET/POST/PUT/PATCH/DELETE 語意是否正確 |
| 回傳格式        | status code + response body 是否統一   |

### 2.5 Cron / 排程

| 檢查項目 | 說明                                  |
| -------- | ------------------------------------- |
| 時區     | cron expression 是否搭配正確 timezone |
| 冪等性   | 重複執行同一個排程是否會產生重複資料  |
| 錯誤隔離 | 單一項目失敗不應該影響其他項目        |
| 啟動註冊 | `app.ts` 是否有呼叫啟動函式           |

### 2.6 前端 Service

| 檢查項目     | 說明                                 |
| ------------ | ------------------------------------ |
| API 路徑對應 | 跟後端 route 是否完全一致            |
| 型別對應     | request/response 型別是否正確 import |
| 錯誤處理     | API 失敗時是否有 fallback            |

### 2.7 前端 UI

| 檢查項目       | 說明                                   |
| -------------- | -------------------------------------- |
| **Spec 比對**  | spec 提到的 UI 元素是否全部實作        |
| payload 完整性 | 表單送出的資料是否涵蓋所有必要欄位     |
| 條件渲染       | 不同 mode / state 下的 UI 是否正確切換 |
| 使用者回饋     | 成功/失敗時是否有 toast / dialog       |
| refresh        | 資料異動後是否有重新載入               |

## 3. Review 心態

1. **先看好的** — 確認哪些寫得正確，再指出問題
2. **對照 spec** — 不是在找 code style 問題，是在驗證「規格是否被正確實現」
3. **追蹤連鎖** — 改了 A 有沒有遺漏 B（例如改了 schema 但前端 cast 沒跟上）
4. **質疑 literal** — 任何手動拼接 SQL / string 的地方都值得多看兩眼
5. **跑一遍 happy path** — 在腦中模擬使用者操作，確認每一步都有對應的程式碼
