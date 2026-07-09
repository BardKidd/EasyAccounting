import { test, expect } from '@playwright/test';
import {
  installDemoOverlay,
  narrate,
  chapter,
  moveTo,
  guestLogin,
  saveVideo,
  API,
  today,
} from './support/demo';

/**
 * 教學影片 #2 — 儀表板導覽（Phase 1，§7）。
 * 導覽：資產總覽四卡（總資產/本月收入/本月支出/本月損益）、資產走勢圖、近期交易、快速新增交易。
 */

const SLUG = 'dashboard-tour';

const CAT = {
  飲食: '115f381d-e49c-4198-a037-af6f457a5fe2',
  薪水: '10ac0ca0-e05d-4b19-a859-c50e0a374074',
} as const;

test.describe.configure({ mode: 'serial' });
test.setTimeout(180_000);

test.afterEach(async ({ page }) => {
  await saveVideo(page, SLUG);
});

test('儀表板導覽：總覽卡 / 資產走勢 / 近期交易', async ({ page }) => {
  await installDemoOverlay(page);

  await page.goto('/login');
  await page.waitForLoadState('networkidle').catch(() => {});
  await chapter(page, '儀表板導覽', 1, 1);
  await narrate(page, '🎬 儀表板：一眼掌握你的整體財務狀況', 2600);
  await guestLogin(page);
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });

  // 種一點資料讓儀表板有數字
  const acctId = (
    await (
      await page.request.post(`${API}/account`, {
        data: { name: '永豐銀行', type: '銀行', balance: 100000, currencyCode: 'TWD', icon: 'wallet', color: '#10b981', isArchived: false, onBudget: true },
      })
    ).json()
  ).data.id as string;
  const tx = (categoryId: string, amount: number, type: '收入' | '支出', description: string) =>
    page.request.post(`${API}/transaction`, {
      data: { accountId: acctId, categoryId, amount, description, date: today(), time: '12:00', receipt: null, paymentFrequency: '單次', type },
    });
  await tx(CAT.薪水, 50000, '收入', '本月薪水');
  await tx(CAT.飲食, 1200, '支出', '聚餐');

  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle').catch(() => {});
  await expect(page.getByRole('heading', { name: '儀表板' })).toBeVisible({ timeout: 15_000 });

  await narrate(page, '上方四張卡：總資產、本月收入、本月支出、本月損益', 3000);
  await moveTo(page, page.getByText('總資產').first());
  await page.waitForTimeout(500);
  await moveTo(page, page.getByText('本月收入').first());
  await page.waitForTimeout(500);
  await moveTo(page, page.getByText('本月支出').first());
  await page.waitForTimeout(600);

  await narrate(page, '中間「資產走勢圖」呈現收入、支出與總資產的月度變化', 3000);
  await page.waitForTimeout(800);

  await narrate(page, '下方「近期交易」列出最新幾筆收支', 2800);
  await expect(page.getByText('本月薪水').first()).toBeVisible({ timeout: 10_000 }).catch(() => {});

  const addBtn = page.getByRole('button', { name: '新增交易' });
  if (await addBtn.count()) {
    await narrate(page, '右上角「新增交易」可隨時快速記一筆', 2400);
    await moveTo(page, addBtn.first());
    await page.waitForTimeout(600);
  }

  await narrate(page, '✅ 儀表板導覽完成：總覽卡、資產走勢、近期交易，一頁掌握財務全貌', 3200);
});
