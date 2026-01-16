import { test, expect } from '@playwright/test';

test('should allow zero amount transfer via UI', async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL || 'rinouo@example.com';
  const password = process.env.TEST_USER_PASSWORD || 'password123';

  // 1. Login
  await page.goto('/');
  await page.getByRole('button', { name: '立即開始' }).click();
  await page.getByRole('textbox', { name: '電子郵件' }).fill(email);
  await page.getByRole('textbox', { name: '密碼' }).fill(password);
  await page.getByRole('button', { name: '登入' }).click();

  // 2. Capture initial balances
  // 假設儀表板上有顯示餘額的卡片，我們透過 AccountSummaryCard 的內容來獲取
  const walletBalanceText = await page.locator('div').filter({ hasText: /^現金錢包$/ }).locator('..').locator('div.text-2xl').innerText();
  const salaryAccountBalanceText = await page.locator('div').filter({ hasText: /^薪資帳戶$/ }).locator('..').locator('div.text-2xl').innerText();

  // 3. Open New Transaction Sheet
  await page.getByRole('button', { name: '新增交易' }).click();

  // 4. Select "操作" (Transfer) type
  await page.getByRole('button', { name: '操作' }).click();

  // 5. Fill transfer details
  // 選擇來源帳戶
  await page.getByRole('combobox', { name: '帳戶' }).click();
  await page.getByRole('option', { name: '現金錢包' }).click();

  // 選擇目標帳戶
  await page.getByRole('combobox', { name: '目標帳戶' }).click();
  await page.getByRole('option', { name: '薪資帳戶' }).click();

  // 輸入金額 0
  await page.getByRole('spinbutton', { name: '金額' }).click();
  await page.getByRole('spinbutton', { name: '金額' }).fill('0');

  // 輸入備註 (選填)
  await page.getByRole('textbox', { name: '備註' }).fill('0 元轉帳測試');

  // 6. Save
  await page.getByRole('button', { name: '儲存交易' }).click();

  // 7. Verify success
  // 預期不應顯示錯誤，且 Sheet 應該關閉或顯示成功訊息
  await expect(page.getByText('新增成功')).toBeVisible();

  // 8. Verify balances remain unchanged
  const finalWalletBalanceText = await page.locator('div').filter({ hasText: /^現金錢包$/ }).locator('..').locator('div.text-2xl').innerText();
  const finalSalaryAccountBalanceText = await page.locator('div').filter({ hasText: /^薪資帳戶$/ }).locator('..').locator('div.text-2xl').innerText();

  expect(finalWalletBalanceText).toBe(walletBalanceText);
  expect(finalSalaryAccountBalanceText).toBe(salaryAccountBalanceText);
});
