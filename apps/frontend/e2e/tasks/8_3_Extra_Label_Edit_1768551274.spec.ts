import { test, expect } from '@playwright/test';

test('should allow editing extra amount labels', async ({ page }) => {
  // 1. Given: 使用者在「新增交易」頁面
  const email = process.env.TEST_USER_EMAIL || 'test@example.com';
  const password = process.env.TEST_USER_PASSWORD || 'password123';
  
  await page.goto('/');
  
  // 登入流程 (參考現有 e2e/add_transaction.spec.ts)
  const loginButton = page.getByRole('button', { name: '立即開始' });
  if (await loginButton.isVisible()) {
    await loginButton.click();
    await page.getByRole('textbox', { name: '電子郵件' }).fill(email);
    await page.getByRole('textbox', { name: '密碼' }).fill(password);
    await page.getByRole('button', { name: '登入' }).click();
  }
  
  // 開啟新增交易對話框
  await page.getByRole('button', { name: '新增交易' }).click();
  
  // 2. Given: 額外金額區塊已展開
  // 根據規格：金額輸入框旁邊放置一個小 icon (例如 +/- 圖示)
  // 點擊此 icon 展開額外金額欄位
  const amountInput = page.getByRole('spinbutton', { name: '金額' });
  await expect(amountInput).toBeVisible();
  
  // 尋找金額旁的展開按鈕 (假設其 title 包含 +/- 或相關圖示)
  const expandButton = page.locator('button').filter({ hasText: /[+\-/]/ }).first();
  await expandButton.click();

  // 3. Given: 標題顯示預設值「折扣」與「手續費」
  const discountLabel = page.getByText('折扣', { exact: true });
  const feeLabel = page.getByText('手續費', { exact: true });
  await expect(discountLabel).toBeVisible();
  await expect(feeLabel).toBeVisible();

  // 4. When: 使用者點擊「折扣」標題
  await discountLabel.click();

  // 5. When: 輸入新名稱「回饋金」並點擊其他地方 (blur)
  // 點擊後標題應轉為輸入框
  const labelInput = page.locator('input').filter({ has: page.locator('..').getByText(/回饋金|折扣/) }).or(page.locator('input[value="折扣"]'));
  
  // 在 TDD Red Phase，這裡預期會因為找不到可編輯的 input 而失敗
  await labelInput.fill('回饋金');
  await page.keyboard.press('Enter');
  await page.locator('body').click(); // Blur

  // 6. Then: 標題更新為「回饋金」
  await expect(page.getByText('回饋金', { exact: true })).toBeVisible();
  await expect(page.getByText('折扣')).not.toBeVisible();

  // 7. Then: 儲存交易後，該標題被保存
  // 填寫其餘必要欄位以完成交易
  await page.getByRole('combobox', { name: '主分類' }).click();
  await page.getByRole('option', { name: '交通' }).first().click();
  await page.getByRole('combobox', { name: '子分類' }).click();
  await page.getByRole('option', { name: '公車' }).first().click();
  await page.getByRole('combobox', { name: '帳戶' }).click();
  await page.getByRole('option', { name: '富邦' }).first().click();
  await amountInput.fill('100');
  
  await page.getByRole('button', { name: '儲存交易' }).click();
  
  // 驗證是否成功儲存
  await expect(page.getByText(/成功|交易已新增/)).toBeVisible();
});
