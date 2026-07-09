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
  today,
} from './support/demo';

/**
 * 教學影片 #4 — 交易 · 標籤（Phase 1，§7）。改造自 e2e/tags-demo.spec.ts，
 * 改用共用 helper 取得紅圈游標 + 漣漪 + 章節列（R1/R2/R3）。
 *
 * 流程：① 新增交易掛標籤（多選既有 + on-the-fly 即時建立）② 列表彩色 chip ③ 依標籤篩選
 */

const SLUG = 'transactions-tags';

test.describe.configure({ mode: 'serial' });
test.setTimeout(180_000);

test.afterEach(async ({ page }) => {
  await saveVideo(page, SLUG);
});

test('交易掛標籤（含即時建立）→ 列表顯示 → 依標籤篩選', async ({ page }) => {
  await installDemoOverlay(page);

  // ── 種子資料（帳戶 / 既有標籤 / 對照交易）──
  await page.goto('/login');
  await page.waitForLoadState('networkidle').catch(() => {});
  await chapter(page, '交易 · 標籤', 1, 3);
  await narrate(
    page,
    '🎬 標籤（Tags）功能\n替交易掛標籤（含即時建立）→ 列表彩色 chip → 依標籤篩選',
    3000,
  );
  await guestLogin(page);
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });

  const acctId = (
    await (
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
      })
    ).json()
  ).data.id as string;
  await page.request.post(`${API}/tags`, {
    data: { name: '日本旅遊 2026', color: '#3b82f6' },
  });
  await page.request.post(`${API}/tags`, {
    data: { name: '可報帳', color: '#f59e0b' },
  });
  const cats = (await (await page.request.get(`${API}/category`)).json())
    .data as any[];
  const anyMain = cats.flatMap((r) => r.children || []).find((c) => c && c.id);
  await page.request.post(`${API}/transaction`, {
    data: {
      accountId: acctId,
      categoryId: anyMain.id,
      amount: 500,
      description: '對照組（無標籤）',
      date: today(),
      time: '09:00',
      receipt: null,
      paymentFrequency: '單次',
      type: '支出',
    },
  });

  // ── ① 新增交易並掛標籤 ──
  await page.goto('/transactions');
  await page.waitForLoadState('networkidle').catch(() => {});
  await narrate(page, '① 新增一筆交易，並在「標籤」欄掛上標籤', 2200);
  await click(page, page.getByRole('button', { name: '新增交易' }));

  const sheet = page.getByRole('dialog');
  await click(page, sheet.getByRole('combobox', { name: '主分類' }));
  await click(page, page.getByRole('option').first());
  const sub = sheet.getByRole('combobox', { name: '子分類' });
  if (await sub.isEnabled()) {
    await click(page, sub);
    await click(page, page.getByRole('option').first());
  }
  await click(page, sheet.getByRole('combobox', { name: '帳戶' }));
  await click(page, page.getByRole('option', { name: '示範錢包' }));
  await type(page, sheet.locator('input[type="number"]').first(), '1200');

  await narrate(page, '打開「標籤」選單：可多選既有標籤，找不到的可即時建立', 2800);
  await click(page, sheet.getByRole('button', { name: '標籤', exact: true }));
  const pop = page.locator('[data-radix-popper-content-wrapper]');
  await expect(pop.getByPlaceholder('搜尋或建立標籤')).toBeVisible();

  await click(page, pop.getByText('日本旅遊 2026'));
  await narrate(page, '選取既有標籤「日本旅遊 2026」', 1600);

  await type(page, pop.getByPlaceholder('搜尋或建立標籤'), '美食');
  await click(page, pop.getByText(/建立「美食」/));
  await narrate(
    page,
    '輸入「美食」→ 直接「建立」即時新增並選取（不必先去設定頁建立）',
    2800,
  );

  await click(page, sheet.getByRole('button', { name: '標籤', exact: true }));
  const chips = sheet.locator('[data-slot="badge"]');
  await expect(chips.filter({ hasText: '日本旅遊 2026' })).toBeVisible();
  await expect(chips.filter({ hasText: '美食' })).toBeVisible();

  await narrate(page, '兩個標籤已掛上，儲存交易', 1800);
  await click(page, sheet.getByRole('button', { name: '儲存交易' }));
  await expect(sheet).toBeHidden({ timeout: 10_000 });

  // ── ② 列表顯示彩色 chip ──
  await chapter(page, '交易 · 標籤', 2, 3);
  await click(page, page.getByTestId('tab-list'));
  await narrate(page, '② 交易列表：每筆交易底下顯示彩色標籤 chip', 2400);
  const table = page.getByTestId('transaction-table');
  await expect(table.getByText('日本旅遊 2026')).toBeVisible({ timeout: 10_000 });
  await expect(table.getByText('美食', { exact: true })).toBeVisible();
  await expect(table.getByText('對照組（無標籤）')).toBeVisible();

  // ── ③ 依標籤篩選 ──
  await chapter(page, '交易 · 標籤', 3, 3);
  await narrate(page, '③ 用上方「標籤」篩選器：只看含「美食」的交易', 2600);
  await click(page, page.getByRole('button', { name: /標籤/ }));
  const fpop = page.locator('[data-radix-popper-content-wrapper]');
  await click(page, fpop.getByText('美食', { exact: true }));
  await page.keyboard.press('Escape');

  await expect(table.getByText('美食', { exact: true })).toBeVisible({
    timeout: 10_000,
  });
  await expect(table.getByText('對照組（無標籤）')).toHaveCount(0);

  await narrate(
    page,
    '✅ 標籤示範完成：掛標籤（含即時建立）/ 列表彩色 chip / 依標籤篩選',
    3400,
  );
});
