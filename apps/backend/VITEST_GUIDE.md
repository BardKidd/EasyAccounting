# Vitest + Supertest 使用指南 (Backend)

## 簡介

這是目前 Node.js 後端最推薦的測試組合。

- **Vitest**: 下一代測試框架，速度極快，原生支援 TypeScript (不用額外設定 ts-jest)，API 相容 Jest。
- **Supertest**: 用於發送 HTTP 請求來測試 API，不需要啟動真實的網路 Port，可以直接對 Express App 進行呼叫。

## Vitest vs Jest 超級比一比

| 特性                | Vitest (推薦)                         | Jest                          |
| :------------------ | :------------------------------------ | :---------------------------- |
| **速度**            | 🚀 **極快** (基於 Vite，HMR 秒速更新) | 🐢 較慢 (需編譯整個專案)      |
| **TypeScript 支援** | ✅ **開箱即用** (原生支援)            | ⚠️ 需安裝 `ts-jest` 並設定    |
| **設定檔 (Config)** | ✅ **共用 Vite Config** (超簡潔)      | ❌ 需獨立且複雜的 Jest Config |
| **API 相容性**      | ✅ **高度相容** (95% Jest API 通用)   | -                             |
| **ESM 支援**        | ✅ **完美支援**                       | ⚠️ 支援度較差                 |
| **Watch Mode**      | ✅ 聰明 (只跑變動的檔案)              | ✅ 支援                       |

**為什麼選擇 Vitest？**

1. **速度就是金錢**：Vitest 啟動跟熱更新都非常快，開發體驗好很多。
2. **設定無腦**：如果你已經用了 Vite (或是新專案)，Vitest 幾乎不用設定就能跑。
3. **無痛遷移**：如果你以前寫過 Jest，Vitest 的語法 (`describe`, `test`, `expect`) 幾乎一模一樣，不用重新學習。

## 1. 基礎設定 (vitest.config.ts)

雖不強制，但建議在 `apps/backend` 根目錄新增此設定檔以優化體驗：

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true, // 允許使用 describe, it, expect 而不用每次引入
    environment: 'node',
  },
});
```

## 2. 如何撰寫測試

測試檔案通常放在 `tests` 資料夾，或是與原檔案放在一起 (例如 `transaction.controller.test.ts`)。

### 範例：測試一隻 GET API

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app'; // 引入你的 Express App 實體

describe('GET /health', () => {
  it('should return 200 OK', async () => {
    // 使用 supertest 發送請求
    const response = await request(app).get('/health');

    // 驗證狀態碼
    expect(response.status).toBe(200);
    // 驗證回傳內容
    expect(response.body).toEqual({ status: 'ok' });
  });
});
```

## 3. 常用指令

在 `package.json` 的 `scripts` 中加入：

```json
"scripts": {
  "test": "vitest",           // 執行測試並監聽變動 (開發模式)
  "test:run": "vitest run",   // 執行一次就結束 (CI 用)
  "test:ui": "vitest --ui"    // 開啟漂亮的網頁介面看測試結果
}
```
