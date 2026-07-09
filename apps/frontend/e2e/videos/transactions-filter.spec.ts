import { test, expect } from '@playwright/test';
import {
  installDemoOverlay,
  narrate,
  chapter,
  click,
  guestLogin,
  saveVideo,
  API,
  today,
} from './support/demo';

/**
 * 教學影片 #7 — 交易 · 篩選（Phase 1，§7）。
 * 流程：列表視圖上以「交易類型」與「帳戶」篩選交易。
 * （標籤篩選已於 transactions-tags 段示範。）
 */

const SLUG = 'transactions-filter';

const CAT = {
  飲食: '115f381d-e49c-4198-a037-af6f457a5fe2',
  交通: '1d0cbd7c-6ad8-4772-9277-9d7d7d86ed2a',
  薪水: '10ac0ca0-e05d-4b19-a859-c50e0a374074',
} as const;

test.describe.configure({ mode: 'serial' });
test.setTimeout(180_000);

test.afterEach(async ({ page }) => {
  await saveVideo(page, SLUG);
});

test('依交易類型與帳戶篩選交易', async ({ page }) => {
  await installDemoOverlay(page);

  await page.goto('/login');
  await page.waitForLoadState('networkidle').catch(() => {});
  await chapter(page, '交易 · 篩選', 1, 2);
  await narrate(page, '🎬 交易篩選：依日期、類型、帳戶、標籤快速找到想看的交易', 2800);
  await guestLogin(page);
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });

  const mk = async (name: string) =>
    (
      await (
        await page.request.post(`${API}/account`, {
          data: { name, type: '銀行', balance: 50000, currencyCode: 'TWD', icon: 'wallet', color: '#10b981', isArchived: false, onBudget: true },
        })
      ).json()
    ).data.id as string;
  const a = await mk('永豐銀行');
  const b = await mk('玉山銀行');

  const tx = (accountId: string, categoryId: string, amount: number, type: '收入' | '支出', description: string) =>
    page.request.post(`${API}/transaction`, {
      data: { accountId, categoryId, amount, description, date: today(), time: '12:00', receipt: null, paymentFrequency: '單次', type },
    });
  await tx(a, CAT.飲食, 250, '支出', '午餐便當');
  await tx(a, CAT.薪水, 50000, '收入', '本月薪水');
  await tx(b, CAT.交通, 800, '支出', '高鐵票');

  // ── 列表視圖 ──
  await page.goto('/transactions?view=list');
  await page.waitForLoadState('networkidle').catch(() => {});
  const table = page.getByTestId('transaction-table');
  await narrate(page, '列表視圖目前顯示全部三筆交易（兩筆支出、一筆收入）', 2800);
  await expect(table.getByText('午餐便當')).toBeVisible({ timeout: 10_000 });
  await expect(table.getByText('本月薪水')).toBeVisible();
  await expect(table.getByText('高鐵票')).toBeVisible();

  // ── 依類型篩選 ──
  await narrate(page, '把「交易類型」篩選為「支出」', 2200);
  await click(page, page.getByRole('combobox').nth(0));
  await click(page, page.getByRole('option', { name: '支出', exact: true }));
  await narrate(page, '列表只剩兩筆支出，收入「本月薪水」被濾掉', 2800);
  await expect(table.getByText('本月薪水')).toHaveCount(0, { timeout: 10_000 });
  await expect(table.getByText('午餐便當')).toBeVisible();
  await expect(table.getByText('高鐵票')).toBeVisible();

  await narrate(page, '把類型改回「所有類型」', 1800);
  await click(page, page.getByRole('combobox').nth(0));
  await click(page, page.getByRole('option', { name: '所有類型' }));
  await expect(table.getByText('本月薪水')).toBeVisible({ timeout: 10_000 });

  // ── 依帳戶篩選 ──
  await chapter(page, '交易 · 篩選', 2, 2);
  await narrate(page, '改用「帳戶」篩選：只看「玉山銀行」的交易', 2600);
  await click(page, page.getByRole('combobox').nth(1));
  await click(page, page.getByRole('option', { name: '玉山銀行' }));
  await narrate(page, '列表只剩「玉山銀行」的高鐵票', 2600);
  await expect(table.getByText('高鐵票')).toBeVisible({ timeout: 10_000 });
  await expect(table.getByText('午餐便當')).toHaveCount(0);

  await narrate(page, '✅ 篩選示範完成：依交易類型、帳戶即時過濾（亦可依日期範圍與標籤）', 3200);
});
