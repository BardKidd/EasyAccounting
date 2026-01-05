import { test, expect } from '@playwright/test';

test('login', async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL || '';
  const password = process.env.TEST_USER_PASSWORD || '';

  await page.goto('/');
  await page.getByRole('button', { name: '立即開始' }).click();
  await page.getByRole('textbox', { name: '電子郵件' }).click();
  await page.getByRole('textbox', { name: '電子郵件' }).fill(email);
  await page.getByRole('textbox', { name: '電子郵件' }).press('Tab');
  await page.getByRole('textbox', { name: '密碼' }).fill(password);
  await page.getByRole('textbox', { name: '密碼' }).press('Enter');
  await page.getByRole('button', { name: '登入' }).click();
});
