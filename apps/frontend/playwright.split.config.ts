import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * 拆分交易 Phase B（Split）專用 Playwright 設定 — 產出「實際操作」示範影片。
 *
 * 一行指令重現（前端 :8090 + 後端 :3000 皆由下方 webServer 自動啟動）：
 *   cd apps/frontend && pnpm test:e2e:split
 *
 * 前置（每位 clone 者各自一次性）：
 *   1) 設定好 apps/backend/.env（PG_* 與 MONGODB_URL）、apps/frontend/.env（NEXT_PUBLIC_API_DOMAIN）
 *   2) 套用 migration（含 transaction_split 與 transaction_split_unit view）：
 *      cd apps/backend && pnpm db:migrate:up
 *
 * video:'on' 一律錄影；只跑 split*.spec.ts，serial 單 worker。
 * 影片輸出：test-results-split/<test>/video.webm
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: /split.*\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 180_000,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report-split' }],
  ],
  outputDir: 'test-results-split',

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
