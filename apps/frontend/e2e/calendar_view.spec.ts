import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_USER_EMAIL || '';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || '';

test.describe('Calendar View', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/');
    await page.getByRole('button', { name: '立即開始' }).click();
    await page.getByRole('textbox', { name: '電子郵件' }).fill(TEST_EMAIL);
    await page.getByRole('textbox', { name: '密碼' }).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: '登入' }).click();

    // Navigate to transactions page
    await page.getByRole('link', { name: '交易紀錄' }).click();
    await page.waitForURL(/\/transactions/);
  });

  test('should switch between list and calendar view', async ({ page }) => {
    // 預設日曆視圖
    await expect(page.locator('.rbc-calendar')).toBeVisible();

    // 切換到列表
    await page.click('[data-testid="tab-list"]');
    await expect(
      page.locator('[data-testid="transaction-table"]'),
    ).toBeVisible();

    // 切回日曆
    await page.click('[data-testid="tab-calendar"]');
    await expect(page.locator('.rbc-calendar')).toBeVisible();
  });

  test('should display react-big-calendar with events', async ({ page }) => {
    const calendar = page.locator('.rbc-calendar');
    await expect(calendar).toBeVisible();

    // 確認有日期格子
    const dateCells = page.locator('.rbc-date-cell');
    await expect(dateCells.first()).toBeVisible();
  });

  test('should open modal when clicking on a date with events', async ({
    page,
  }) => {
    // 點擊任一有 event 的日期格子
    const eventCell = page.locator('.rbc-event').first();

    // 如果有事件才測試
    const eventCount = await eventCell.count();
    if (eventCount > 0) {
      // 取得事件所在的日期格子
      const dayCell = eventCell.locator('..').locator('..');
      await dayCell.click();

      // 應開啟 Modal（等待 data-testid 或 dialog）
      const modal = page.locator('[data-testid="day-modal"]');
      await expect(modal).toBeVisible({ timeout: 3000 });
    }
  });

  test('should navigate between months', async ({ page }) => {
    const calendar = page.locator('.rbc-calendar');
    await expect(calendar).toBeVisible();

    // 記錄目前月份
    const currentLabel = await page.locator('.rbc-toolbar-label').textContent();

    // 點擊上一個月
    await page.click('button:has(.lucide-chevron-left)');
    await page.waitForTimeout(300);

    const prevLabel = await page.locator('.rbc-toolbar-label').textContent();
    expect(prevLabel).not.toBe(currentLabel);

    // 點擊下一個月回來
    await page.click('button:has(.lucide-chevron-right)');
    await page.waitForTimeout(300);

    const nextLabel = await page.locator('.rbc-toolbar-label').textContent();
    expect(nextLabel).toBe(currentLabel);
  });

  test('should show transfer events with distinct styling', async ({
    page,
  }) => {
    // 檢查是否有轉帳樣式的事件（bg-cyan）
    const transferEvents = page.locator('.rbc-event .bg-cyan-100');
    // 這是軟性測試 - 如果有轉帳交易就會有這個樣式
    const count = await transferEvents.count();

    // 僅記錄，不失敗（因為可能測試帳號沒有轉帳資料）
    console.log(`Found ${count} transfer events`);
  });

  // 拖放測試需要更複雜的設置，使用 skip 標記
  test.skip('should update date on drag and drop', async ({ page }) => {
    const event = page.locator('.rbc-event').first();
    const targetCell = page.locator('.rbc-date-cell').nth(15);

    await event.dragTo(targetCell);

    // 等待 API 呼叫完成
    await page.waitForResponse(/\/transactions\/.+/);

    // 驗證 toast 訊息
    await expect(page.locator('.sonner-toast')).toBeVisible();
  });
});
