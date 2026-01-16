import { test, expect } from '@playwright/test';

test('should complete transfer and update both account balances via UI', async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL || '';
  const password = process.env.TEST_USER_PASSWORD || '';

  // 1. 使用者已登入
  await page.goto('/');
  
  // 處理可能出現的登入流程
  const startButton = page.getByRole('button', { name: '立即開始' });
  if (await startButton.isVisible()) {
    await startButton.click();
  }

  await page.getByRole('textbox', { name: '電子郵件' }).fill(email);
  await page.getByRole('textbox', { name: '密碼' }).fill(password);
  await page.getByRole('button', { name: '登入' }).click();

  // 進入儀表板
  await expect(page.getByRole('heading', { name: '儀表板' })).toBeVisible();

  // 展開「銀行」帳戶分組以查看餘額
  const bankGroup = page.getByText('銀行', { exact: true });
  await bankGroup.click();

  // 2. 帳戶 A 餘額顯示 $10,000
  const accountARow = page.locator('div').filter({ hasText: /^帳戶 A$/ }).locator('xpath=..');
  const accountABalance = accountARow.locator('span.font-mono');
  await expect(accountABalance).toHaveText('$10,000');

  // 3. 帳戶 B 餘額顯示 $5,000
  const accountBRow = page.locator('div').filter({ hasText: /^帳戶 B$/ }).locator('xpath=..');
  const accountBBalance = accountBRow.locator('span.font-mono');
  await expect(accountBBalance).toHaveText('$5,000');

  // 4. 使用者點擊「新增交易」
  await page.getByRole('button', { name: '新增交易' }).click();

  // 5. 選擇「轉帳」類型 (對應 UI 上的「操作」按鈕)
  await page.getByRole('button', { name: '操作' }).click();

  // 6. 主分類選擇「轉帳」
  await page.getByRole('combobox', { name: '主分類' }).click();
  await page.getByRole('option', { name: '轉帳' }).click();

  // 7. 從 A 轉 $500 到 B
  await page.getByRole('combobox', { name: '帳戶' }).click();
  await page.getByRole('option', { name: '帳戶 A' }).click();

  await page.getByRole('combobox', { name: '目標帳戶' }).click();
  await page.getByRole('option', { name: '帳戶 B' }).click();

  await page.getByRole('spinbutton', { name: '金額' }).fill('500');

  // 8. 點擊「儲存」
  await page.getByRole('button', { name: '儲存交易' }).click();

  // 9. 顯示成功訊息
  await expect(page.getByText(/成功/)).toBeVisible();

  // 10. 帳戶 A 餘額顯示 $9,500
  await expect(accountABalance).toHaveText('$9,500');

  // 11. 帳戶 B 餘額顯示 $5,500
  await expect(accountBBalance).toHaveText('$5,500');
});
