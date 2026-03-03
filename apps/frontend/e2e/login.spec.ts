import { test, expect } from '@playwright/test';

test('login', async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL || '';
  const password = process.env.TEST_USER_PASSWORD || '';

  await page.goto('/');
  await page.getByRole('link', { name: '免費開始使用' }).click();
  await page.getByPlaceholder('name@example.com').click();
  await page.getByPlaceholder('name@example.com').fill(email);
  await page.getByPlaceholder('name@example.com').press('Tab');
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByPlaceholder('••••••••').press('Enter');
  await page.getByRole('button', { name: '登入' }).click();
});
