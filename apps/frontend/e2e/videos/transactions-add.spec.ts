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
 * 教學影片 #3 — 交易 · 新增（Phase 1，§7）。參考 e2e/add_transaction.spec.ts。
 * 流程：新增交易表單填寫（型態/分類/帳戶/金額/備註）→ 儲存 → 列表確認。
 */

const SLUG = 'transactions-add';

test.describe.configure({ mode: 'serial' });
test.setTimeout(180_000);

test.afterEach(async ({ page }) => {
  await saveVideo(page, SLUG);
});

test('新增一筆支出：分類/帳戶/金額/備註 → 儲存 → 列表確認', async ({ page }) => {
  await installDemoOverlay(page);

  await page.goto('/login');
  await page.waitForLoadState('networkidle').catch(() => {});
  await chapter(page, '交易 · 新增', 1, 2);
  await narrate(page, '🎬 新增交易：記下一筆收支的最基本流程', 2600);
  await guestLogin(page);
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });

  // 種一個帳戶（交易表單需要可選帳戶）
  await page.request.post(`${API}/account`, {
    data: {
      name: '永豐銀行',
      type: '銀行',
      balance: 50000,
      currencyCode: 'TWD',
      icon: 'wallet',
      color: '#10b981',
      isArchived: false,
      onBudget: true,
    },
  });

  // ── 開啟表單、填寫 ──
  await page.goto('/transactions');
  await page.waitForLoadState('networkidle').catch(() => {});
  await narrate(page, '點右上「新增交易」開啟表單', 2000);
  await click(page, page.getByRole('button', { name: '新增交易' }));

  const sheet = page.getByRole('dialog');
  await narrate(page, '預設為「支出」。先選主分類，再選子分類', 2400);
  await click(page, sheet.getByRole('combobox', { name: '主分類' }));
  await click(page, page.getByRole('option').first());
  const sub = sheet.getByRole('combobox', { name: '子分類' });
  if (await sub.isEnabled()) {
    await click(page, sub);
    await click(page, page.getByRole('option').first());
  }

  await narrate(page, '選擇支付帳戶', 1800);
  await click(page, sheet.getByRole('combobox', { name: '帳戶' }));
  await click(page, page.getByRole('option', { name: '永豐銀行' }));

  await narrate(page, '輸入金額與備註', 2000);
  await type(page, sheet.locator('input[type="number"]').first(), '250');
  const note = sheet.getByRole('textbox', { name: '備註' });
  if (await note.count()) {
    await type(page, note, '午餐便當');
  }

  await narrate(page, '按「儲存交易」送出', 1800);
  await click(page, sheet.getByRole('button', { name: '儲存交易' }));
  await expect(sheet).toBeHidden({ timeout: 10_000 });

  // ── 列表確認 ──
  await chapter(page, '交易 · 新增', 2, 2);
  await click(page, page.getByTestId('tab-list'));
  await narrate(page, '切到列表視圖：剛新增的交易已出現', 2400);
  const table = page.getByTestId('transaction-table');
  await expect(table.getByText('午餐便當')).toBeVisible({ timeout: 10_000 });
  await narrate(page, '✅ 新增交易完成：選分類/帳戶 → 填金額備註 → 儲存 → 列表可見', 3200);
});
