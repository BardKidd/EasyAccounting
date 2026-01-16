import { test, expect } from '@playwright/test';

test('should automatically convert negative expense to positive expense', async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL || '';
  const password = process.env.TEST_USER_PASSWORD || '';
  const timestamp = 1768521600000;
  const note = `Negative Correction Test ${timestamp}`;

  // 1. Login
  await page.goto('/');
  await page.getByRole('button', { name: '立即開始' }).click();
  await page.getByRole('textbox', { name: '電子郵件' }).fill(email);
  await page.getByRole('textbox', { name: '密碼' }).fill(password);
  await page.getByRole('button', { name: '登入' }).click();

  // 2. Open Add Transaction Sheet
  await page.getByRole('button', { name: '新增交易' }).click();

  // 3. Ensure "支出" is selected (Default)
  const expenseBtn = page.getByRole('button', { name: '支出' });
  await expect(expenseBtn).toBeVisible();
  await expenseBtn.click();

  // 4. Fill in the form
  await page.getByRole('combobox', { name: '帳戶' }).click();
  await page.getByRole('option', { name: '現金錢包' }).click();

  await page.getByRole('combobox', { name: '主分類' }).click();
  await page.getByRole('option', { name: '飲食' }).click();

  await page.getByRole('combobox', { name: '子分類' }).click();
  await page.getByRole('option', { name: '早餐' }).click();

  // 5. Input negative amount
  const amountInput = page.getByRole('spinbutton', { name: '金額' });
  await amountInput.click();
  await amountInput.fill('-50');

  // 6. Fill in Note to identify this transaction
  await page.getByRole('textbox', { name: '備註' }).fill(note);

  // 7. Save
  await page.getByRole('button', { name: '儲存交易' }).click();

  // 8. Navigate to Transaction History
  await page.getByRole('link', { name: '交易紀錄' }).click();

  // 9. Verify the transaction
  // Find the row with our note
  const row = page.locator('tr', { hasText: note });
  await expect(row).toBeVisible();

  // Verify Type is "支出"
  await expect(row.locator('td').nth(1)).toHaveText('支出');

  // Verify Amount is corrected to "50"
  // Note: Currently TransactionTable renders expenses as "-50".
  // The test expects "50" as per requirements, so this should fail in TDD Red Phase.
  await expect(row.locator('td').nth(5)).toHaveText('50');
});
