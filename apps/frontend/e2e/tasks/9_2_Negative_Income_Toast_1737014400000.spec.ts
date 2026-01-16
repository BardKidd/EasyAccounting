import { test, expect } from '@playwright/test';

/**
 * Task 9.2: 收入輸入負數 UI 轉換提示 E2E
 * 
 * 關鍵規則: 收入輸入負數 → 系統自動轉換為支出，前端應有提示
 */
test('should show toast when income negative amount is converted to expense', async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL || 'test@example.com';
  const password = process.env.TEST_USER_PASSWORD || 'password123';
  
  await page.goto('/');
  
  // 登入流程 (參考現有 add_transaction.spec.ts)
  const startButton = page.getByRole('button', { name: '立即開始' });
  if (await startButton.isVisible()) {
    await startButton.click();
    await page.getByRole('textbox', { name: '電子郵件' }).fill(email);
    await page.getByRole('textbox', { name: '密碼' }).fill(password);
    await page.getByRole('button', { name: '登入' }).click();
  }

  // 開啟新增交易彈窗
  await page.getByRole('button', { name: '新增交易' }).click();
  
  // 1. 選擇類型「收入」
  await page.getByRole('button', { name: '收入' }).click();
  
  // 選擇必要的分類與帳戶 (確保表單可送出)
  await page.getByRole('combobox', { name: '主分類' }).click();
  // 收入分類通常有「薪水」
  await page.getByRole('option', { name: '薪水' }).click();
  
  await page.getByRole('combobox', { name: '帳戶' }).click();
  // 帳戶通常有「現金錢包」
  await page.getByRole('option', { name: /現金錢包|薪資帳戶/ }).first().click();
  
  // 2. 在金額欄位輸入 -100
  await page.getByRole('spinbutton', { name: '金額' }).click();
  await page.getByRole('spinbutton', { name: '金額' }).fill('-100');
  
  // 3. 點擊「儲存交易」
  await page.getByRole('button', { name: '儲存交易' }).click();
  
  // 4. 驗證 Toast 訊息出現，且內容包含關鍵字
  // 根據規格：告知已轉換為「支出」
  // Sonner toast 通常在 [data-sonner-toast]
  const toastMessage = page.locator('[data-sonner-toast]');
  await expect(toastMessage).toBeVisible();
  await expect(toastMessage).toContainText(/轉換|支出/);
  
  // 5. 驗證交易成功建立 (選擇性，但符合完成條件)
  // 通常成功後會關閉彈窗或是顯示成功訊息
  await expect(page.getByText('新增交易')).not.toBeVisible();
});
