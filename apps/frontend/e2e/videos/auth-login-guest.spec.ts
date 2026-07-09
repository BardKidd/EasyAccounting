import { test, expect } from '@playwright/test';
import {
  installDemoOverlay,
  narrate,
  chapter,
  moveTo,
  click,
  guestLogin,
  saveVideo,
} from './support/demo';

/**
 * 教學影片 #1 — 登入 / 免註冊試用（Phase 1 核心流程，§7）。
 * 也是 Phase 0 的端到端驗證段：確認字幕 + 紅圈游標 + 漣漪 + 錄影 → mp4 全鏈打通。
 *
 * 重現：cd apps/frontend && pnpm video:record -g 訪客
 * 出片：cd apps/frontend && pnpm video:make
 */

const SLUG = 'auth-login-guest';

test.describe.configure({ mode: 'serial' });
test.setTimeout(180_000);

test.afterEach(async ({ page }) => {
  await saveVideo(page, SLUG);
});

test('登入頁導覽 → 免註冊試用進入主應用', async ({ page }) => {
  await installDemoOverlay(page);

  await page.goto('/login');
  await page.waitForLoadState('networkidle').catch(() => {});

  await chapter(page, '登入 · 免註冊試用', 1, 2);
  await narrate(
    page,
    '🎬 EasyAccounting 登入\n這支影片示範登入頁，以及最快上手的「免註冊試用」',
    3000,
  );

  // 介紹登入表單（游標滑過 Email / 密碼欄位，純導覽不輸入）
  await narrate(page, '一般使用者在這裡輸入 Email 與密碼登入', 1800);
  await moveTo(page, page.getByPlaceholder('name@example.com'));
  await page.waitForTimeout(500);
  await moveTo(page, page.getByPlaceholder('••••••••'));
  await page.waitForTimeout(700);

  // 免註冊試用
  await chapter(page, '登入 · 免註冊試用', 2, 2);
  await narrate(
    page,
    '想先試用？點「免註冊試用」即可建立臨時帳號，免填任何資料',
    2800,
  );

  const guestBtn = page.getByRole('button', { name: '免註冊試用' });
  await moveTo(page, guestBtn); // 紅圈先滑到按鈕
  await page
    .evaluate(() => {
      const r = document.getElementById('__e2e_cursor__');
      if (r) (window as any).__ripple?.(parseFloat(r.style.left), parseFloat(r.style.top));
    })
    .catch(() => {});
  await guestLogin(page); // 含 4 次重試的穩健登入 loop

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  await page.waitForLoadState('networkidle').catch(() => {});

  await chapter(page, '登入 · 完成', 2, 2);
  await narrate(
    page,
    '✅ 已進入主應用儀表板\n所有功能皆可試用（訪客資料不會永久保存）',
    3200,
  );
});
