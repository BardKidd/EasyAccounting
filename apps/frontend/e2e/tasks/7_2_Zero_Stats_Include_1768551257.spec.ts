import { test, expect } from '@playwright/test';

/**
 * Task 7.2: 零元交易統計報表計入 E2E
 * This test verifies that zero-amount transactions are included in the transaction count
 * on the statistics page, while not affecting the total amount.
 */
test('should include zero amount transaction in statistics display', async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL || 'test@example.com';
  const password = process.env.TEST_USER_PASSWORD || 'password123';

  // 1. Login
  await page.goto('/');
  await page.getByRole('button', { name: '立即開始' }).click();
  await page.getByRole('textbox', { name: '電子郵件' }).fill(email);
  await page.getByRole('textbox', { name: '密碼' }).fill(password);
  await page.getByRole('button', { name: '登入' }).click();

  // 2. Create $100 transaction
  await page.getByRole('button', { name: '新增交易' }).click();
  await page.getByRole('combobox', { name: '主分類' }).click();
  await page.getByRole('option', { name: '交通' }).click();
  await page.getByRole('combobox', { name: '子分類' }).click();
  await page.getByRole('option', { name: '公車' }).click();
  await page.getByRole('combobox', { name: '帳戶' }).click();
  await page.getByRole('option', { name: '富邦' }).click();
  await page.getByRole('spinbutton', { name: '金額' }).fill('100');
  await page.getByRole('button', { name: '儲存交易' }).click();

  // Wait for dialog to close and button to be reachable again
  await expect(page.getByRole('button', { name: '新增交易' })).toBeVisible();

  // 3. Create $0 transaction
  await page.getByRole('button', { name: '新增交易' }).click();
  await page.getByRole('combobox', { name: '主分類' }).click();
  await page.getByRole('option', { name: '交通' }).click();
  await page.getByRole('combobox', { name: '子分類' }).click();
  await page.getByRole('option', { name: '公車' }).click();
  await page.getByRole('combobox', { name: '帳戶' }).click();
  await page.getByRole('option', { name: '富邦' }).click();
  await page.getByRole('spinbutton', { name: '金額' }).fill('0');
  await page.getByRole('button', { name: '儲存交易' }).click();

  await expect(page.getByRole('button', { name: '新增交易' })).toBeVisible();

  // 4. Navigate to Statistics
  await page.getByRole('link', { name: '統計報表' }).click();

  // 5. Go to Category Tab
  await page.getByRole('tab', { name: '類別' }).click();

  // 6. Assertions
  // Find the '交通' category row.
  const categoryRow = page.locator('div.flex.items-center', { hasText: '交通' }).first();
  
  // Verify transaction count is at least 2.
  // If the implementation is correct, it should show "2 筆交易" (or more if existing data exists)
  await expect(categoryRow.getByText(/2 筆交易/)).toBeVisible();
  
  // Total amount for this category should be $100
  await expect(categoryRow.getByText('$100')).toBeVisible();

  // Global total in the footer of the CategoryList
  const footer = page.locator('div.bg-muted\/30');
  await expect(footer.getByText('$100')).toBeVisible();
});