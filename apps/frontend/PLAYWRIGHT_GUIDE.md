# Playwright 使用指南 (Frontend)

## 簡介

Playwright 是微軟開發的 E2E (End-to-End) 測試工具，能操控真實瀏覽器，模擬使用者行為。

## Playwright vs Cypress 超級比一比

| 特性                   | Playwright (推薦)                   | Cypress                                 |
| :--------------------- | :---------------------------------- | :-------------------------------------- |
| **速度**               | 🚀 **極快** (平行執行是原生的)      | 🐢 較慢 (循序執行)                      |
| **穩定性 (Flakiness)** | ✅ **高** (自動等待元素出現)        | ⚠️ 普通 (有時需手動 wait)               |
| **多頁籤/多視窗**      | ✅ **支援** (原生支援多 Tab 操作)   | ❌ 不支援                               |
| **語法風格**           | `async/await` (標準 JS/TS)          | Chainable (獨特語法 `cy.get().click()`) |
| **瀏覽器支援**         | ✅ 全面 (Chromium, Firefox, WebKit) | ✅ 全面 (但 WebKit 支援較晚)            |
| **安裝**               | 簡單 (`npm init playwright@latest`) | 簡單                                    |

**為什麼選擇 Playwright？**

1. **更穩定的測試**：Playwright 的 Auto-wait 機制非常聰明，減少了 "element not visible" 這種惱人的錯誤。
2. **更現代的語法**：直接寫 `await`，除錯跟讀 Code 都更直覺。
3. **原生支援多 Tab**：如果你的應用有「開新視窗」的功能，Cypress 會很痛苦，Playwright 輕輕鬆鬆。

## 1. 基礎設定 (playwright.config.ts)

安裝後通常會自動產生，若無可手動建立。主要設定測試目錄、瀏覽器類型等。

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  /* 平行測試 */
  fullyParallel: true,
  /* 在 CI 上失敗時不重試，本地可以重試 */
  retries: process.env.CI ? 2 : 0,
  /* 使用的瀏覽器專案 */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  /* 啟動本地開發伺服器進行測試 (重要！) */
  webServer: {
    command: 'pnpm dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

## 2. 強大功能：Codegen (錄製測試)

這是不想寫 Code 的人的救星。

在終端機輸入：

```bash
npx playwright codegen http://localhost:3000
```

瀏覽器會打開，你就像平常一樣操作 (點擊、輸入)。
Playwright 會在旁邊的小視窗**自動產生對應的程式碼**！你可以直接複製貼上。

## 3. 如何撰寫測試 (手寫範例)

通常放在 `apps/frontend/tests` 或 `e2e` 資料夾。

```typescript
import { test, expect } from '@playwright/test';

test('首頁應該要有標題', async ({ page }) => {
  // 1. 前往頁面
  await page.goto('/');

  // 2. 採取行動 (可省略，如果是純驗證)
  // await page.getByRole('button', { name: 'Login' }).click();

  // 3. 驗證期望結果
  await expect(page).toHaveTitle(/EasyAccounting/);
  await expect(page.getByText('總資產')).toBeVisible();
});
```

## 4. 常用指令

```bash
npx playwright test        # 執行所有測試 (無頭模式，看不到瀏覽器)
npx playwright test --ui   # 開啟 UI 介面，可以時光倒流看每一步驟
npx playwright show-report # 查看測試報告
```
