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
 * 教學影片 #6 — 交易 · 日曆/列表視圖（Phase 1，§7）。參考 e2e/calendar_view.spec.ts。
 * 流程：預設日曆視圖 → 切列表 → 切回日曆 → 上一月/下一月導航。
 */

const SLUG = 'transactions-views';

test.describe.configure({ mode: 'serial' });
test.setTimeout(180_000);

test.afterEach(async ({ page }) => {
  await saveVideo(page, SLUG);
});

test('日曆視圖 ↔ 列表視圖 + 月份導航', async ({ page }) => {
  await installDemoOverlay(page);

  await page.goto('/login');
  await page.waitForLoadState('networkidle').catch(() => {});
  await chapter(page, '交易 · 視圖切換', 1, 3);
  await narrate(page, '🎬 交易紀錄有兩種檢視：日曆視圖與列表視圖', 2600);
  await guestLogin(page);
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });

  // 種一筆交易，日曆上才有事件可看
  const acctId = (
    await (
      await page.request.post(`${API}/account`, {
        data: { name: '永豐銀行', type: '銀行', balance: 50000, currencyCode: 'TWD', icon: 'wallet', color: '#10b981', isArchived: false, onBudget: true },
      })
    ).json()
  ).data.id as string;
  const cats = (await (await page.request.get(`${API}/category`)).json()).data as any[];
  const anyMain = cats.flatMap((r) => r.children || []).find((c) => c && c.id);
  await page.request.post(`${API}/transaction`, {
    data: { accountId: acctId, categoryId: anyMain.id, amount: 680, description: '日曆上的交易', date: today(), time: '12:00', receipt: null, paymentFrequency: '單次', type: '支出' },
  });

  // ── 日曆視圖（預設）──
  await page.goto('/transactions');
  await page.waitForLoadState('networkidle').catch(() => {});
  await narrate(page, '預設為「日曆視圖」：交易以事件顯示在對應日期格子裡', 2800);
  await expect(page.locator('.rbc-calendar')).toBeVisible({ timeout: 10_000 });

  // ── 切到列表 ──
  await chapter(page, '交易 · 視圖切換', 2, 3);
  await narrate(page, '點「列表」切換到列表視圖（適合逐筆檢視與篩選）', 2600);
  await click(page, page.getByTestId('tab-list'));
  await expect(page.getByTestId('transaction-table')).toBeVisible({ timeout: 10_000 });

  await narrate(page, '點「日曆」切回日曆視圖', 2000);
  await click(page, page.getByTestId('tab-calendar'));
  await expect(page.locator('.rbc-calendar')).toBeVisible({ timeout: 10_000 });

  // ── 月份導航（自訂 toolbar：箭頭與「今天」皆在 .rbc-calendar 內）──
  await chapter(page, '交易 · 月份導航', 3, 3);
  await narrate(page, '用日曆上方的左箭頭切換到上個月', 2200);
  await click(page, page.locator('.rbc-calendar button:has(.lucide-chevron-left)').first());
  await page.waitForTimeout(1200);
  await narrate(page, '點「今天」回到本月', 2000);
  await click(page, page.locator('.rbc-calendar').getByRole('button', { name: '今天' }));
  await page.waitForTimeout(1000);
  await expect(page.locator('.rbc-calendar')).toBeVisible();

  await narrate(page, '✅ 視圖示範完成：日曆 ↔ 列表切換、月份導航', 3000);
});
