import { test, expect } from '@playwright/test';

test('should display zero amount transaction in green color', async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL || '';
  const password = process.env.TEST_USER_PASSWORD || '';
  
  // 1. Login
  await page.goto('/');
  await page.getByRole('button', { name: '立即開始' }).click();
  await page.getByRole('textbox', { name: '電子郵件' }).fill(email);
  await page.getByRole('textbox', { name: '密碼' }).fill(password);
  await page.getByRole('button', { name: '登入' }).click();

  // 2. Create a $0 transaction (Expense)
  await page.getByRole('button', { name: '新增交易' }).click();
  
  // Select category
  await page.getByRole('combobox', { name: '主分類' }).click();
  await page.getByRole('option', { name: '交通' }).first().click();
  
  // Select account
  await page.getByRole('combobox', { name: '帳戶' }).click();
  await page.getByRole('option', { name: '富邦' }).first().click();

  // Set amount to 0
  await page.getByRole('spinbutton', { name: '金額' }).fill('0');
  
  // Set note for identification
  const timestamp = Date.now();
  const note = `zero-amount-test-${timestamp}`;
  await page.getByRole('textbox', { name: '備註' }).fill(note);
  
  await page.getByRole('button', { name: '儲存交易' }).click();

  // 3. Go to Transaction List
  await page.getByRole('link', { name: '交易紀錄' }).click();

  // 4. Verify $0 transaction is green and shows $0
  // Find the row with the specific note
  const row = page.locator('tr', { hasText: note });
  await expect(row).toBeVisible();
  
  // Find the amount cell (usually the last cell in the row)
  const amountCell = row.locator('td').last();
  
  // Assertion 1: Amount should display as $0
  // According to spec: "金額顯示為 $0"
  // Current implementation in transactionTable.tsx likely shows "-0"
  await expect(amountCell).toHaveText(/\$0/);
  
  // Assertion 2: Color should be green (income style)
  // According to transactionTable.tsx, income uses 'text-emerald-600'
  const amountSpan = amountCell.locator('span');
  await expect(amountSpan).toHaveClass(/text-emerald-600/);
});
