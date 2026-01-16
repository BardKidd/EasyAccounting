import { test, expect } from '@playwright/test';

/**
 * Task 8.2: 額外金額欄位同排顯示 E2E
 * 
 * 規格要求:
 * 1. extraAdd (折扣) 與 extraMinus (手續費) 同一排 (Y 座標相同)
 * 2. 兩者各佔約 50% 寬度
 */
test.describe('Task 8.2: Extra Amount Layout', () => {
  test('should display extraAdd and extraMinus inputs in the same row', async ({ page }) => {
    // 1. 登入流程
    const email = process.env.TEST_USER_EMAIL || 'test@example.com';
    const password = process.env.TEST_USER_PASSWORD || 'password';
    
    await page.goto('/');
    
    // 如果在登陸頁面，點擊「立即開始」
    const startButton = page.getByRole('button', { name: '立即開始' });
    if (await startButton.isVisible()) {
      await startButton.click();
    }
    
    // 輸入帳密登入
    const emailInput = page.getByRole('textbox', { name: '電子郵件' });
    if (await emailInput.isVisible()) {
      await emailInput.fill(email);
      await page.getByRole('textbox', { name: '密碼' }).fill(password);
      await page.getByRole('button', { name: '登入' }).click();
    }

    // 2. 開啟「新增交易」表單
    await page.getByRole('button', { name: '新增交易' }).click();

    // 3. 展開額外金額區塊
    // 規格: 金額輸入框旁邊放置一個小 icon (例如 +/- 圖示)
    const extraToggle = page.locator('button[aria-label="展開額外金額"]');
    await expect(extraToggle).toBeVisible();
    await extraToggle.click();

    // 4. 驗證「折扣」(extraAdd) 與「手續費」(extraMinus) 的排列
    const extraAddInput = page.getByLabel('折扣');
    const extraMinusInput = page.getByLabel('手續費');

    // 確保欄位已顯示
    await expect(extraAddInput).toBeVisible();
    await expect(extraMinusInput).toBeVisible();

    const addBox = await extraAddInput.boundingBox();
    const minusBox = await extraMinusInput.boundingBox();

    if (!addBox || !minusBox) {
      throw new Error('無法取得額外金額輸入框的邊界框 (Bounding Box)');
    }

    // 驗證: 同一排 (Y 座標相同，允許 5 像素內的誤差)
    expect(Math.abs(addBox.y - minusBox.y)).toBeLessThan(5);

    // 驗證: 寬度接近 (各佔約 50%)
    // 兩者寬度應非常接近
    expect(Math.abs(addBox.width - minusBox.width)).toBeLessThan(addBox.width * 0.1);

    // 驗證: 兩者在同一行且水平相鄰
    expect(addBox.x).toBeLessThan(minusBox.x);
    const gap = minusBox.x - (addBox.x + addBox.width);
    expect(gap).toBeGreaterThanOrEqual(0);
    expect(gap).toBeLessThan(50); // 正常的 grid 間距
    
    // 驗證: 寬度佔比 (相對於父容器)
    const container = page.locator('div:has(> .grid):has-text("折扣")').first();
    const containerBox = await container.boundingBox();
    if (containerBox) {
      // 每個輸入框寬度應接近父容器的一半
      expect(addBox.width).toBeGreaterThan(containerBox.width * 0.4);
      expect(addBox.width).toBeLessThan(containerBox.width * 0.6);
      expect(minusBox.width).toBeGreaterThan(containerBox.width * 0.4);
      expect(minusBox.width).toBeLessThan(containerBox.width * 0.6);
    }
  });
});
