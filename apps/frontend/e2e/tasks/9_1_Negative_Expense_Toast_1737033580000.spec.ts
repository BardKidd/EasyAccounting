import { test, expect } from '@playwright/test';

test('should show toast when expense negative amount is converted to income', async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL || '';
  const password = process.env.TEST_USER_PASSWORD || '';

  // Login
  await page.goto('/');
  await page.getByRole('button', { name: '立即開始' }).click();
  await page.getByRole('textbox', { name: '電子郵件' }).fill(email);
  await page.getByRole('textbox', { name: '密碼' }).fill(password);
  await page.getByRole('button', { name: '登入' }).click();

  // Go to Add Transaction
  await page.getByRole('button', { name: '新增交易' }).click();

  // Select "支出" (Expense) - usually default, but let's be explicit if possible
  // In many shadcn/ui forms, tabs or buttons are used for type selection.
  // Looking at add_transaction.spec.ts, it doesn't specify type, so it might be default.
  // We'll assume the button/tab for "支出" is available.
  const expenseButton = page.getByRole('button', { name: '支出' });
  if (await expenseButton.isVisible()) {
    await expenseButton.click();
  }

  // Fill required fields
  await page.getByRole('combobox', { name: '主分類' }).click();
  await page.getByRole('option', { name: '交通' }).click();
  await page.getByRole('combobox', { name: '子分類' }).click();
  await page.getByRole('option', { name: '公車' }).click();
  await page.getByRole('combobox', { name: '帳戶' }).click();
  await page.getByRole('option', { name: '富邦' }).click();

  // Input negative amount
  await page.getByRole('spinbutton', { name: '金額' }).click();
  await page.getByRole('spinbutton', { name: '金額' }).fill('-50');

  // Click Save
  await page.getByRole('button', { name: '儲存交易' }).click();

  // Verify Toast message
  // We expect a toast containing "轉換" and "收入"
  // Using a more robust locator for sonner/toast
  await expect(page.locator('[data-sonner-toast]')).toContainText(/轉換|收入/);
});
