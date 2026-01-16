import { test, expect } from '@playwright/test';

test('should display correct Net Amount in transaction list', async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL || 'test@example.com';
  const password = process.env.TEST_USER_PASSWORD || 'password';

  // 1. 使用者已登入
  await page.goto('/');
  // 點擊「立即開始」進入登入頁面
  await page.getByRole('button', { name: '立即開始' }).click();
  // 填寫登入資訊
  await page.getByRole('textbox', { name: '電子郵件' }).fill(email);
  await page.getByRole('textbox', { name: '密碼' }).fill(password);
  await page.getByRole('button', { name: '登入' }).click();

  // 2. 建立一筆支出交易: amount=1000, extraMinus=10, extraAdd=100
  // 點擊新增交易按鈕
  await page.getByRole('button', { name: '新增交易' }).click();
  
  // 選擇必要欄位
  await page.getByRole('combobox', { name: '主分類' }).click();
  await page.getByRole('option', { name: '交通' }).click();
  await page.getByRole('combobox', { name: '子分類' }).click();
  await page.getByRole('option', { name: '公車' }).click();
  await page.getByRole('combobox', { name: '帳戶' }).click();
  await page.getByRole('option', { name: '富邦' }).click();
  
  // 輸入原始金額
  await page.getByRole('spinbutton', { name: '金額' }).fill('1000');
  
  // 點擊展開額外金額輸入框 (根據 spec 6.7，會有一個 icon 觸發)
  // 這裡假設 label 為 "展開額外金額" 或類似名稱，Red Phase 預期找不到此元素
  const extraAmountTrigger = page.getByRole('button', { name: '展開額外金額' });
  await extraAmountTrigger.click();
  
  // 填寫 extraMinus (手續費) 與 extraAdd (折扣)
  // 根據 spec 6.7，預設標題為「手續費」與「折扣」
  await page.getByRole('spinbutton', { name: '手續費' }).fill('10');
  await page.getByRole('spinbutton', { name: '折扣' }).fill('100');
  
  // 儲存交易
  await page.getByRole('button', { name: '儲存交易' }).click();

  // 3. 使用者進入交易列表頁面
  await page.getByRole('link', { name: '交易紀錄' }).click();

  // 4. 驗證該筆交易顯示金額為 $910 (非 $1000)
  // 支出 Net Amount = amount + extraMinus - extraAdd
  // 1000 + 10 - 100 = 910
  
  // 斷言列表中的金額顯示為 $910
  const netAmountDisplay = page.getByText('$910');
  await expect(netAmountDisplay).toBeVisible();
  
  // 額外驗證原始金額 $1000 不應作為主金額顯示
  const originalAmountDisplay = page.getByText('$1000');
  await expect(originalAmountDisplay).not.toBeVisible();
});
