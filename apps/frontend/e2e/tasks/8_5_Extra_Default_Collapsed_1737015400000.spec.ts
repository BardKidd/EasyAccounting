import { test, expect } from '@playwright/test';

test('should have extra amount section collapsed by default', async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL || '';
  const password = process.env.TEST_USER_PASSWORD || '';
  
  // Given: 使用者已登入
  await page.goto('/');
  await page.getByRole('button', { name: '立即開始' }).click();
  await page.getByRole('textbox', { name: '電子郵件' }).fill(email);
  await page.getByRole('textbox', { name: '密碼' }).fill(password);
  await page.getByRole('button', { name: '登入' }).click();

  // When: 使用者進入「新增交易」頁面 (Sheet)
  await page.getByRole('button', { name: '新增交易' }).click();

  // Then: 額外金額輸入區塊為隱藏/收合狀態
  // 驗證輸入框不可見 (包含預設標籤與規格名稱)
  const extraAddInput = page.getByRole('spinbutton', { name: '額外增加' });
  const extraMinusInput = page.getByRole('spinbutton', { name: '額外減少' });
  const discountInput = page.getByRole('spinbutton', { name: '折扣' });
  const feeInput = page.getByRole('spinbutton', { name: '手續費' });

  await expect(extraAddInput).not.toBeVisible();
  await expect(extraMinusInput).not.toBeVisible();
  await expect(discountInput).not.toBeVisible();
  await expect(feeInput).not.toBeVisible();
});
