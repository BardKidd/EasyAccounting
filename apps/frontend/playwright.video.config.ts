import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * 功能教學影片專用 Playwright 設定 — 對照 docs/specs/tutorial-video-spec.md（V4/V5/V8/V10）。
 *
 * 一行指令（前端 :8080 + 後端 :3000 由下方 webServer 自動啟動；日常 dev 已在跑則重用）：
 *   cd apps/frontend && pnpm video:record            # 錄全部段落
 *   cd apps/frontend && pnpm video:record -g 標籤     # 只錄符合的段落
 *   cd apps/frontend && pnpm video:make               # 錄完自動轉 mp4 到 docs/videos/
 *
 * 前置（一次性）：brew install ffmpeg；設好 .env；cd apps/backend && pnpm db:migrate:up。
 *
 * 埠（V10，2026-06-20 修訂）：直接用日常 dev 的 8080，而非另起 8090。
 *   原因：next dev 的 .next/dev/lock 跨埠共用，8080 有 dev 在跑時無法再起 8090；
 *   且 dev 模式 CORS 放行任意 localhost，毋須 8090 + ORIGIN_URL 對齊。
 *   reuseExistingServer 確保「有 dev 就重用、沒跑就自己起」。
 *
 * 與預設 playwright.config.ts 的差異：
 * - 只跑 e2e/videos/ 下的段落 spec。
 * - video:'on'（一律錄）、slowMo:250（R4 速度不過快）、1440×900（V4）。
 * - serial 單 worker（單一 guest session 跑完整流程，順序穩定）。
 *
 * 原始錄影：e2e/videos/.raw/<slug>.webm（由 demo.ts 的 saveVideo 具名存放）。
 */
export default defineConfig({
  testDir: './e2e/videos',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 240_000,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report-video' }],
  ],
  outputDir: 'e2e/videos/.pw',

  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on',
    video: { mode: 'on', size: { width: 1440, height: 900 } },
    viewport: { width: 1440, height: 900 },
    launchOptions: { slowMo: 250 }, // R4：每個動作間插入停頓
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

  // 前後端皆「有跑就重用、沒跑才起」；dev CORS 放行任意 localhost，毋須 ORIGIN_URL 對齊。
  webServer: [
    {
      command: 'pnpm --filter backend dev',
      env: { ORIGIN_URL: 'http://localhost:8080' },
      url: 'http://localhost:3000/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    {
      command: 'npm run dev -- -p 8080',
      url: 'http://localhost:8080',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
