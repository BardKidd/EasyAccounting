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
 * 教學影片 — 交易 · 編輯 / 刪除。
 * 流程：① 從日曆點該筆交易開啟編輯面板 → 改金額 → 儲存 → 列表確認金額更新
 *      ② 再開該筆 → 按「刪除」→ 確認對話框 → 該筆從列表消失
 *
 * 註：列表（transaction-table）為唯讀，無法由列表開編輯面板；編輯/刪除面板
 *     只能從「日曆視圖」點交易事件開啟（onSelectEvent → TransactionSheet）。
 *     因此本腳本用日曆事件開面板，列表僅作為前後狀態的驗證。
 */

const SLUG = 'transactions-edit-delete';

test.describe.configure({ mode: 'serial' });
test.setTimeout(180_000);

test.afterEach(async ({ page }) => {
  await saveVideo(page, SLUG);
});

test('編輯交易（改金額）→ 列表確認 → 刪除交易 → 列表消失', async ({ page }) => {
  await installDemoOverlay(page);

  await page.goto('/login');
  await page.waitForLoadState('networkidle').catch(() => {});
  await chapter(page, '交易 · 編輯/刪除', 1, 2);
  await narrate(
    page,
    '🎬 編輯與刪除交易\n從日曆點開既有交易 → 修改金額 → 儲存；再開該筆 → 刪除',
    3000,
  );
  await guestLogin(page);
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });

  // ── 種子資料（帳戶 + 一筆可編輯的交易）──
  const acctId = (
    await (
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
      })
    ).json()
  ).data.id as string;

  const cats = (await (await page.request.get(`${API}/category`)).json())
    .data as any[];
  const anyMain = cats.flatMap((r) => r.children || []).find((c) => c && c.id);

  await page.request.post(`${API}/transaction`, {
    data: {
      accountId: acctId,
      categoryId: anyMain.id,
      amount: 300,
      description: '可編輯的交易',
      date: today(),
      time: '12:00',
      receipt: null,
      paymentFrequency: '單次',
      type: '支出',
    },
  });

  // ── 先在列表確認原始交易（金額 300）──
  await page.goto('/transactions');
  await page.waitForLoadState('networkidle').catch(() => {});
  await narrate(page, '先切到列表，確認剛種下的「可編輯的交易」', 2400);
  await click(page, page.getByTestId('tab-list'));
  const table = page.getByTestId('transaction-table');
  await expect(table.getByText('可編輯的交易')).toBeVisible({ timeout: 10_000 });

  // ── ① 編輯：從日曆點交易開面板，改金額 ──
  await narrate(page, '① 切回日曆，點交易事件開啟編輯面板', 2600);
  await click(page, page.getByTestId('tab-calendar'));
  await expect(page.locator('.rbc-calendar')).toBeVisible({ timeout: 10_000 });

  await click(page, page.locator('.rbc-event').first());
  const sheet = page.getByRole('dialog');
  await expect(sheet.getByText('編輯交易')).toBeVisible({ timeout: 10_000 });

  await narrate(page, '把金額由 300 改成 450', 2400);
  await type(page, sheet.locator('input[type="number"]').first(), '450');

  // 種子交易僅帶主分類，編輯表單要求子分類；補選一個才能存檔
  const sub = sheet.getByRole('combobox', { name: '子分類' });
  if (await sub.isEnabled().catch(() => false)) {
    await narrate(page, '補選一個子分類', 1600);
    await click(page, sub);
    await click(page, page.getByRole('option').first());
  }

  await narrate(page, '按「儲存」送出更新', 2000);
  await click(page, sheet.getByRole('button', { name: '儲存', exact: true }));
  await expect(sheet).toBeHidden({ timeout: 10_000 });

  // ── 列表確認金額已更新為 450 ──
  await narrate(page, '回列表確認：金額已更新為 450', 2600);
  await click(page, page.getByTestId('tab-list'));
  await expect(table.getByText('可編輯的交易')).toBeVisible({ timeout: 10_000 });
  await expect(table.getByText('450')).toBeVisible({ timeout: 10_000 });

  // ── ② 刪除：再從日曆開面板，按刪除 ──
  await chapter(page, '交易 · 編輯/刪除', 2, 2);
  await narrate(page, '② 要刪除這筆交易，一樣從日曆點開它', 2600);
  await click(page, page.getByTestId('tab-calendar'));
  await expect(page.locator('.rbc-calendar')).toBeVisible({ timeout: 10_000 });

  await click(page, page.locator('.rbc-event').first());
  await expect(sheet.getByText('編輯交易')).toBeVisible({ timeout: 10_000 });

  await narrate(page, '面板左下角的「刪除」按鈕會跳出確認對話框', 2800);
  await click(page, sheet.getByRole('button', { name: '刪除' }));

  // 確認對話框（AlertDialog）：標題「確定要刪除這筆交易嗎？」，確認按鈕「刪除」
  const confirm = page.getByRole('alertdialog');
  await expect(confirm.getByText('確定要刪除這筆交易嗎？')).toBeVisible({
    timeout: 10_000,
  });
  await narrate(page, '此操作無法復原，點「刪除」確認', 2600);
  await click(page, confirm.getByRole('button', { name: '刪除' }));
  await expect(sheet).toBeHidden({ timeout: 10_000 });

  // ── 列表確認該筆已消失 ──
  await narrate(page, '回列表確認：該筆交易已被移除', 2600);
  await click(page, page.getByTestId('tab-list'));
  await expect(table.getByText('可編輯的交易')).toHaveCount(0, {
    timeout: 10_000,
  });

  await narrate(
    page,
    '✅ 編輯/刪除示範完成：改金額並儲存 → 列表更新；刪除並確認 → 列表移除',
    3400,
  );
});
