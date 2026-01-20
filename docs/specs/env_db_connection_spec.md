# 環境變數與資料庫連線規格書 (Environment & DB Connection Spec)

## 1. 環境定義與 NODE_ENV 設定

系統區分為以下三種主要運行環境。請確保各環境的 `NODE_ENV` 設定如下：

| 環境 (Environment)    | 說明                              | NODE_ENV 值   | 備註                                                             |
| :-------------------- | :-------------------------------- | :------------ | :--------------------------------------------------------------- |
| **Local (本地開發)**  | 開發者本機電腦                    | `development` | 程式碼同時支援連接本地 DB 或雲端開發 DB                          |
| **CI (持續整合)**     | GitHub Actions 或雲端 CI Pipeline | `test`        | 用於跑單元測試或集成測試，通常連接 Service Container 中的臨時 DB |
| **Production (生產)** | 正式上線環境                      | `production`  | 正式環境，連線必須最嚴謹                                         |

> **說明**：
>
> - **Local**: 使用 `development` 以啟用詳細錯誤訊息和熱重載等開發功能。
> - **CI**: 建議明確使用 `test`。這能讓應用程式知道它正在被測試（例如：停用一般的 Logger、不啟動真實的 HTTP Server 監聽端口以免衝突、不發送真實信件等）。
> - **Production**: 使用 `production` 以啟用效能優化 (Logging 簡化、Caching 等)。

---

## 2. 資料庫連線與 SSL 策略

因應雲端資料庫（如 Neon, AWS RDS, Heroku, Railway 等）通常強制或建議使用 SSL 連線，必須採用動態判斷策略。

### 核心邏輯

**SSL 啟用條件**：

1. 當 `NODE_ENV` 為 `production` 時：**強制開啟**。
2. 當連線目標主機 (`PG_HOST`) **不是** `localhost` 或 `127.0.0.1` 時（即連線到遠端/雲端資料庫）：**強制開啟**。
3. 其他情況（本地開發連本地 DB、CI 容器內連線）：**關閉** (或視本地 DB 設定而定，預設關閉以簡化開發)。

### 連線參數配置 (Sequelize / pg)

針對 `dialectOptions` 的配置建議如下：

```typescript
const isProduction = process.env.NODE_ENV === 'production';
// 判斷是否為雲端主機 (非 localhost)
const isCloudHost =
  process.env.PG_HOST &&
  !process.env.PG_HOST.includes('localhost') &&
  !process.env.PG_HOST.includes('127.0.0.1');

const dialectOptions = {
  // 若是生產環境 或 連接雲端主機 -> 啟用 SSL
  ...((isProduction || isCloudHost) && {
    ssl: {
      require: true,
      // 雲端 PaaS (如 Railway/Neon) 若無設定自定義 CA，通常需設為 false 以略過憑證鏈檢查
      // 若資安要求極高，應下載雲端提供商的 CA 憑證並設為 true
      rejectUnauthorized: false,
    },
  }),
};
```

---

## 3. 各環境詳細配置表

### A. 本地開發環境 (Local Development)

- **情境 1：本地 App + 本地 DB**
  - `NODE_ENV`: `development`
  - `PG_HOST`: `localhost`
  - **SSL**: OFF
- **情境 2：本地 App + 雲端開發 DB**
  - `NODE_ENV`: `development`
  - `PG_HOST`: `<cloud-db-host>` (e.g., `ep-xyz.us-east-2.aws.neon.tech`)
  - **SSL**: ON (由 `isCloudHost` 邏輯自動判斷啟用)

### B. CI 環境 (Continuous Integration)

- **情境：GitHub Actions / Container**
  - `NODE_ENV`: `test`
  - `PG_HOST`: `localhost` (Service Container) 或 `postgres` (Docker Network Alias)
  - **SSL**: OFF (通常 CI 裡的 Service Container 預設不開 SSL)
  - **注意**：測試時應用程式應避免啟動真實的 `app.listen()`，交由測試框架 (如 Supertest) 處理。

### C. 生產環境 (Production)

- **情境：雲端 App + 雲端 DB**
  - `NODE_ENV`: `production`
  - `PG_HOST`: `<cloud-db-host>`
  - **SSL**: ON (強制啟用)

---

## 4. 遺漏細節與補充建議

1.  **Sequelize CLI 設定同步 (`database/config.js`)**
    - 目前的 `config.js` 中 `development` 區塊強制開啟了 SSL (`ssl: { require: true }`)。
    - **風險**：若開發者試圖在本地使用 `npx sequelize-cli db:migrate` 連接「本地 Docker DB」，會因為本地 DB 沒開 SSL 而連線失敗。
    - **建議**：將 `config.js` 的邏輯也改為動態判斷，或從環境變數讀取 (e.g. `DB_SSL=true/false`)。

2.  **連線池 (Connection Pooling)**
    - 在 Serverless 環境 (如部署到 Vercel Functions 連接資料庫) 或高併發雲端環境，需注意連線數限制。
    - 建議在 `Sequelize` 建構子中加入 `pool` 設定：
      ```javascript
      pool: {
        max: 10, // 視方案限制調整 (Neon 免費版/Pro 版限制不同)
        min: 0,
        acquire: 30000,
        idle: 10000
      }
      ```

3.  **環境變數一致性**
    - 前端 (Next.js) 與後端 (Express) 分離時，前端的環境變數 (以 `NEXT_PUBLIC_` 開頭) 與後端的 `process.env` 是分開的。確保部署平台 (Vercel/Railway) 上的環境變數名稱一致。

---

## 5. 身份驗證與 Cookie 策略 (Authentication & Cookie Policy)

Cookie 設定亦遵循環境變數進行自動化調整，主要邏輯位於 `apps/backend/src/utils/auth.ts`。

### Domain 與 Secure 設定

| 環境 (Environment)     | 判斷依據                     | Cookie Domain                  | Secure (HTTPS) | SameSite |
| :--------------------- | :--------------------------- | :----------------------------- | :------------- | :------- |
| **Production**         | `NODE_ENV=production`        | `.riinouo-eaccounting.win`     | ✅ True        | `none`   |
| **Cloud Dev (測試站)** | `PG_HOST` 指向雲端 & 非 Prod | `.dev.riinouo-eaccounting.win` | ✅ True        | `none`   |
| **Local (本地開發)**   | 其他 (Localhost)             | `undefined` (Host-Only)        | ❌ False       | `lax`    |

- **Cookie Domain**:
  - 生產與雲端測試環境明確指定網域，以支援跨子網域存取 (如前後端分離)。
  - 本地開發設為 `undefined`，讓瀏覽器自動綁定當前 Host (localhost)，避免網域不匹配問題。
- **Secure**: 雲端環境強制啟用 HTTPS 與 `SameSite=none` 以支援跨站請求；本地則放寬限制。
