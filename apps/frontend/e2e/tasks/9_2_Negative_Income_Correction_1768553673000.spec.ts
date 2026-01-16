import { test, expect } from '@playwright/test';

/**
 * Task 9.2: 收入輸入負數自動轉正數 E2E
 * User Feedback: 收入輸入負數不應轉為支出，而是僅取絕對值修正為正數收入 (視為輸入錯誤自動修正)。
 */
test('should automatically convert negative income to positive income', async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL || 'test@example.com';
  const password = process.env.TEST_USER_PASSWORD || 'password';
  const timestamp = Date.now();
  const uniqueNote = `Negative Income Test ${timestamp}`;

  // 1. 登入
  await page.goto('/');
  // 檢查是否有「立即開始」按鈕，如果沒有可能已經在登入頁面或是首頁邏輯不同
  const startButton = page.getByRole('button', { name: '立即開始' });
  if (await startButton.isVisible()) {
    await startButton.click();
  }
  
  await page.getByRole('textbox', { name: '電子郵件' }).fill(email);
  await page.getByRole('textbox', { name: '密碼' }).fill(password);
  await page.getByRole('button', { name: '登入' }).click();

  // 2. 開啟新增交易彈窗
  await page.getByRole('button', { name: '新增交易' }).click();

  // 3. 選擇「收入」類型
  // 根據 RootType.INCOME = '收入'
  await page.getByRole('button', { name: '收入', exact: true }).click();

  // 4. 選擇帳戶
  await page.getByRole('combobox', { name: '帳戶' }).click();
  // 預期 seed 會有「現金錢包」
  await page.getByRole('option', { name: '現金錢包' }).click();

  // 5. 選擇主分類
  await page.getByRole('combobox', { name: '主分類' }).click();
  // 預期 seed 會有「薪水」
  await page.getByRole('option', { name: '薪水' }).click();

  // 6. 輸入負數金額
  await page.getByRole('spinbutton', { name: '金額' }).click();
  await page.getByRole('spinbutton', { name: '金額' }).fill('-100');

  // 7. 輸入備註以供辨識
  await page.getByRole('textbox', { name: '備註' }).fill(uniqueNote);

  // 8. 儲存
  await page.getByRole('button', { name: '儲存交易' }).click();

  // 9. 前往交易紀錄頁面
  await page.getByRole('link', { name: '交易紀錄' }).click();

  // 10. 驗證交易結果
  // 尋找包含唯一備註的列
  const row = page.locator('tr', { hasText: uniqueNote });
  await expect(row).toBeVisible();
  
  // 驗證類型是否維持為「收入」
  // 在 TableBody 中，類型是第二個 Cell
  await expect(row.locator('td').nth(1)).toHaveText('收入');
  
  // 驗證金額是否正確儲存為正數 (100)
  // 在 TransactionTable 中，收入會顯示為 +100
  await expect(row.locator('td').nth(5)).toHaveText('+100');
});
