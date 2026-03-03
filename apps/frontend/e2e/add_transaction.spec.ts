import { test, expect } from '@playwright/test';

test('User can create a transaction', async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL || '';
  const password = process.env.TEST_USER_PASSWORD || '';
  await page.goto('/');
  await page.getByRole('link', { name: '免費開始使用' }).click();
  await page.getByPlaceholder('name@example.com').fill(email);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByRole('button', { name: '登入' }).click();
  await page.getByRole('button', { name: '新增交易' }).click();
  await page.getByRole('combobox', { name: '主分類' }).click();
  await page.getByRole('option', { name: '交通' }).click();
  await page.getByRole('combobox', { name: '子分類' }).click();
  await page.getByRole('option', { name: '公車' }).click();
  await page.getByRole('combobox', { name: '帳戶' }).click();
  await page.getByRole('option', { name: '富邦' }).click();
  await page.getByRole('spinbutton', { name: '金額' }).click();
  await page.getByRole('spinbutton', { name: '金額' }).fill('12');
  await page.getByRole('textbox', { name: '備註' }).click();
  await page.getByRole('textbox', { name: '備註' }).fill('e2e');
  await page.getByRole('textbox', { name: '備註' }).press('CapsLock');
  await page.getByRole('textbox', { name: '備註' }).fill('e2e 自動測試');
  await page.getByRole('button', { name: '儲存交易' }).click();
  await page.locator('a[href="/transactions"]').first().click({ force: true });
  await page.getByRole('cell', { name: '-01-06 12:30:03' }).click();
});
