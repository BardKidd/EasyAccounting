import { test, expect } from '@playwright/test';
import {
  installDemoOverlay,
  narrate,
  chapter,
  click,
  type,
  guestLogin,
  saveVideo,
  API,
} from './support/demo';

/**
 * 教學影片 #5 — 交易 · 拆分（Phase 1，§7）。改造自 e2e/split-demo.spec.ts。
 * 流程：① 輸入總額開啟拆分 ② 子項分類/金額即時配平 ③ 列表顯示「拆分 N」
 */

const SLUG = 'transactions-split';

test.describe.configure({ mode: 'serial' });
test.setTimeout(180_000);

test.afterEach(async ({ page }) => {
  await saveVideo(page, SLUG);
});

test('開啟拆分 → 子項分類/金額 → 即時配平 → 列表標記', async ({ page }) => {
  await installDemoOverlay(page);

  await page.goto('/login');
  await page.waitForLoadState('networkidle').catch(() => {});
  await chapter(page, '交易 · 拆分', 1, 3);
  await narrate(
    page,
    '🎬 拆分交易（Split）\n一筆交易拆成多個分類（全聯 1200 → 食材 800 + 日用品 400）',
    2800,
  );
  await guestLogin(page);
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });

  await page.request.post(`${API}/account`, {
    data: {
      name: '示範錢包',
      type: '銀行',
      balance: 50000,
      currencyCode: 'TWD',
      icon: 'wallet',
      color: '#10b981',
      isArchived: false,
      onBudget: true,
    },
  });

  // ── ① 輸入總額、開啟拆分 ──
  await page.goto('/transactions');
  await page.waitForLoadState('networkidle').catch(() => {});
  await narrate(page, '① 新增一筆交易，輸入總額後開啟「拆分」', 2200);
  await click(page, page.getByRole('button', { name: '新增交易' }));

  const sheet = page.getByRole('dialog');
  await click(page, sheet.getByRole('combobox', { name: '帳戶' }));
  await click(page, page.getByRole('option', { name: '示範錢包' }));
  await type(page, sheet.locator('input[type="number"]').first(), '1200');

  await narrate(
    page,
    '打開「拆分成多個分類」開關\n頂層分類隱藏，改用子項列逐項分配',
    2600,
  );
  await click(page, sheet.getByRole('switch'));
  await expect(sheet.getByTestId('split-editor')).toBeVisible();

  // ── ② 子項分類/金額 + 即時配平 ──
  await chapter(page, '交易 · 拆分', 2, 3);
  const editor = sheet.getByTestId('split-editor');

  await click(page, editor.getByRole('combobox').nth(0));
  await click(page, page.getByRole('option').first());
  await type(page, editor.locator('input[type="number"]').nth(0), '800');
  await narrate(
    page,
    '子項 1：選分類、填 800\n下方即時顯示「剩餘 400」（未配平為琥珀色）',
    2800,
  );
  await expect(editor.getByText(/剩餘\s*400/)).toBeVisible();

  await click(page, editor.getByRole('combobox').nth(1));
  await click(page, page.getByRole('option').nth(1));
  await type(page, editor.locator('input[type="number"]').nth(1), '400');
  await narrate(
    page,
    '子項 2：選分類、填 400\n加總 = 總額 → 顯示「已配平」（綠色），即可儲存',
    2800,
  );
  await expect(editor.getByText('已配平')).toBeVisible();

  await click(page, sheet.getByRole('button', { name: '儲存交易' }));
  await expect(sheet).toBeHidden({ timeout: 10_000 });

  // ── ③ 列表顯示「拆分」標記 ──
  await chapter(page, '交易 · 拆分', 3, 3);
  await click(page, page.getByTestId('tab-list'));
  await narrate(page, '③ 交易列表：該筆顯示「拆分 2」標記', 2400);
  const table = page.getByTestId('transaction-table');
  await expect(table.getByText(/拆分\s*2/)).toBeVisible({ timeout: 10_000 });
  await narrate(
    page,
    '✅ 拆分示範完成：開啟拆分 → 子項分類/金額 → 即時配平 → 列表標記',
    3200,
  );
});
