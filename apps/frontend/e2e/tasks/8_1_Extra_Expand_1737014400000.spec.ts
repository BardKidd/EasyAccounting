import { test, expect } from '@playwright/test';

test('should expand extra amount input section with animation on icon click', async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL || 'test@example.com';
  const password = process.env.TEST_USER_PASSWORD || 'password';

  // 1. Given: 使用者在「新增交易」頁面
  await page.goto('/');
  
  // 登入流程 (參考 add_transaction.spec.ts)
  const loginButton = page.getByRole('button', { name: '立即開始' });
  if (await loginButton.isVisible()) {
    await loginButton.click();
    await page.getByRole('textbox', { name: '電子郵件' }).fill(email);
    await page.getByRole('textbox', { name: '密碼' }).fill(password);
    await page.getByRole('button', { name: '登入' }).click();
  }

  // 開啟新增交易 Sheet
  await page.getByRole('button', { name: '新增交易' }).click();

  // 驗證初始狀態：額外金額區塊應為收合 (不可見)
  const extraAddInput = page.locator('input[name="extraAdd"]');
  const extraMinusInput = page.locator('input[name="extraMinus"]');
  
  await expect(extraAddInput).not.toBeVisible();
  await expect(extraMinusInput).not.toBeVisible();

  // 2. When: 使用者點擊金額輸入框旁的 +/- icon
  // 根據規格，金額輸入框旁邊有個 +/- icon
  const toggleIcon = page.getByRole('button', { name: '+/-' });
  await toggleIcon.click();

  // 3. Then: 額外金額輸入區塊以動畫滑出，輸入框可見
  await expect(extraAddInput).toBeVisible();
  await expect(extraMinusInput).toBeVisible();

  // 驗證標題可見性 (預設為「折扣」或「手續費」)
  await expect(page.getByText('折扣')).toBeVisible();
  await expect(page.getByText('手續費')).toBeVisible();
});
