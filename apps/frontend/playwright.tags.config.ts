import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * 拆分交易+標籤 Phase A（Tags）專用 Playwright 設定 — 產出「實際操作」示範影片。
 *
 * 一行指令重現（前端 :8090 + 後端 :3000 皆由下方 webServer 自動啟動）：
 *   cd apps/frontend && pnpm test:e2e:tags
 *
 * 前置（每位 clone 者各自一次性）：
 *   1) 設定好 apps/backend/.env（PG_* 與 MONGODB_URL）、apps/frontend/.env（NEXT_PUBLIC_API_DOMAIN）
 *   2) 套用 migration 建 tag/transaction_tag 表：cd apps/backend && pnpm db:migrate:up
 *
 * 與預設 playwright.config.ts 的差異：
 * - 前端跑在 8090，後端以 ORIGIN_URL=http://localhost:8090 啟動（兩者對齊，CORS 才會過）。
 * - video: 'on' —— 一律錄影（預設 retain-on-failure，通過就刪；本任務要保留影片）。
 * - 只跑 tags*.spec.ts，serial 單 worker（單一 guest session 跑完整流程）。
 *
 * 影片輸出：test-results-tags/<test>/video.webm
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: /tags.*\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 180_000,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report-tags' }],
  ],
  outputDir: 'test-results-tags',

  use: {
    baseURL: 'http://localhost:8090',
    trace: 'on',
    video: { mode: 'on', size: { width: 1440, height: 900 } },
    viewport: { width: 1440, height: 900 },
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],

  // 後端與前端皆自動啟動；後端以 ORIGIN_URL=:8090 對齊前端（已在 :3000/:8090 運行則重用）。
  webServer: [
    {
      command: 'pnpm --filter backend dev',
      env: { ORIGIN_URL: 'http://localhost:8090' },
      url: 'http://localhost:3000/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    {
      command: 'npm run dev -- -p 8090',
      url: 'http://localhost:8090',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
