import { test, expect } from '@playwright/test';
import {
  installDemoOverlay,
  narrate,
  chapter,
  click,
  type,
  login,
  saveVideo,
} from './support/demo';

/**
 * 教學影片 #5 — 設定 · 標籤管理。照 transactions-tags.spec.ts 的結構與風格。
 *
 * 流程：① 新增標籤（選色 + 命名）② 改色（即時更新）③ 封存 ④ 刪除（原生 confirm）
 *
 * ⚠️ 風險：本影片用 guest 帳號進 /settings，而 guest 的 /settings 頁有與標籤無關的
 *    既有 SSR 相依（需通知設定列），故 /settings 可能無法渲染。仍以 login 撰寫；
 *    主流程錄製時若 guest /settings 失敗，會改用測試帳號（goto /login → 填
 *    placeholder 'name@example.com' = TEST_USER_EMAIL、'••••••••' = TEST_USER_PASSWORD
 *    → click 登入），再重跑本檔。
 *
 * 注意：tagSettings 的封存 / 刪除按鈕用 title 屬性（→ accessible name），且每列都有，
 *    故本腳本只建立「一個」標籤以保證 getByRole('button', { name: '封存' / '刪除' }) 唯一。
 */

const SLUG = 'settings-tags';

test.describe.configure({ mode: 'serial' });
test.setTimeout(180_000);

test.afterEach(async ({ page }) => {
  await saveVideo(page, SLUG);
});

test('標籤管理：新增 → 改色 → 封存 → 刪除', async ({ page }) => {
  await installDemoOverlay(page);

  // ── 片頭 + 登入 ──
  await page.goto('/login');
  await page.waitForLoadState('networkidle').catch(() => {});
  await chapter(page, '設定 · 標籤管理', 1, 4);
  await narrate(
    page,
    '🎬 標籤管理\n於「設定 → 標籤管理」新增標籤 → 改色 → 封存 → 刪除',
    3000,
  );
  await login(page);
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });

  // ── 進設定頁，切到「標籤管理」分頁 ──
  await page.goto('/settings');
  await page.waitForLoadState('networkidle').catch(() => {});
  await click(page, page.getByRole('tab', { name: '標籤管理' }));
  await narrate(page, '進入「設定 → 標籤管理」分頁', 2200);

  // ── ① 新增標籤（選色 + 命名）──
  await narrate(page, '① 新增標籤：先選一個顏色', 2200);
  // 原生 color input：直接 fill 設值（swatch 會更新），別嘗試開原生色票
  await page.getByLabel('新標籤顏色').fill('#3b82f6');
  await narrate(page, '輸入標籤名稱「出差」，按「新增」', 2400);
  await type(page, page.getByPlaceholder('輸入標籤名稱'), '出差');
  await click(page, page.getByRole('button', { name: '新增' }));

  // 確認清單出現「出差」（用該列的顏色 input 作為穩定錨點）
  await expect(page.getByLabel('出差 顏色')).toBeVisible({ timeout: 10_000 });
  await narrate(page, '標籤「出差」已建立並出現在清單中', 2200);

  // ── ② 改色（即時更新）──
  await chapter(page, '設定 · 標籤管理', 2, 4);
  await narrate(page, '② 點該列的色塊換成橙色，顏色即時更新', 2600);
  await page.getByLabel('出差 顏色').fill('#f59e0b');
  await expect(page.getByLabel('出差 顏色')).toHaveValue('#f59e0b');

  // ── ③ 封存 ──
  await chapter(page, '設定 · 標籤管理', 3, 4);
  await narrate(page, '③ 封存「出差」：暫時隱藏但不刪除資料', 2600);
  // scope 到「出差」那一列（測試帳號可能已有其他標籤，避免按鈕不唯一）
  const tagRow = page.getByLabel('出差 顏色').locator('..');
  await click(page, tagRow.getByRole('button', { name: '封存' }));
  await expect(tagRow.getByText('已封存')).toBeVisible({ timeout: 10_000 });
  await narrate(page, '清單列出現「已封存」標記', 2000);

  // ── ④ 刪除（原生 confirm，需先註冊自動確認）──
  await chapter(page, '設定 · 標籤管理', 4, 4);
  await narrate(page, '④ 刪除「出差」：跳出確認對話框，按確定移除', 2600);
  // ⚠️ 刪除走瀏覽器原生 confirm()，必須在點刪除「前」註冊自動確認
  page.on('dialog', (d) => d.accept());
  // 封存後刪除鈕仍在，scope 到「出差」列
  await click(page, tagRow.getByRole('button', { name: '刪除' }));

  // 確認「出差」從清單消失
  await expect(page.getByLabel('出差 顏色')).toHaveCount(0, { timeout: 10_000 });

  await narrate(
    page,
    '✅ 標籤管理示範完成：新增 / 改色 / 封存 / 刪除',
    3400,
  );
});
