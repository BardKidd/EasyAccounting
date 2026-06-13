import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * 預算（YNAB）功能專用的 Playwright 設定。
 *
 * 與預設 playwright.config.ts 的差異：
 * - 前端跑在 8090（預設 8080 被本機其他程式佔用），baseURL 對齊。
 * - video: 'on' —— 一律錄影（預設是 retain-on-failure，測試通過會刪影片，
 *   而本任務的目的就是要產出「實際操作」的影片檔給使用者看）。
 * - 只跑 budget*.spec.ts，serial 單 worker（單一 guest session 跑完整流程）。
 *
 * 後端（:3000）需另外啟動，且 ORIGIN_URL 須允許 http://localhost:8090：
 *   cd apps/backend && ORIGIN_URL=http://localhost:8090 PORT=3000 pnpm dev
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: /budget.*\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 120_000,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-budget' }]],
  outputDir: 'test-results-budget',

  use: {
    baseURL: 'http://localhost:8090',
    trace: 'on',
    video: { mode: 'on', size: { width: 1440, height: 900 } },
    viewport: { width: 1440, height: 900 },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],

  webServer: {
    command: 'npm run dev -- -p 8090',
    url: 'http://localhost:8090',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
