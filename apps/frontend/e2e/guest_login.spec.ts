import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * Guest Login E2E Tests
 *
 * 為了避免 rate limiter (5/hr/IP) 問題，將測試分為兩組：
 * - Group A: 共用一個 guest session，驗證基本功能 → 最後才 logout
 * - Group B: 獨立 guest session，驗證 promote 流程
 *
 * 每組內部 serial 執行，共用 browser context 和 page。
 */

// ═══════════════════════════════════════════════════════════════════
// Group A: 共用 Guest Session — 基本功能 + Logout
// ═══════════════════════════════════════════════════════════════════
test.describe('Guest Login — Basic Flow & Logout', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(120000);

  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('1. should create guest account and redirect to dashboard', async () => {
    // 進入 login 頁面
    await page.goto('/');
    await page.getByRole('link', { name: '免費開始使用' }).click();
    await page.waitForURL('**/login');

    // 點擊免註冊試用
    await page.getByRole('button', { name: '免註冊試用' }).click();
    await page.waitForURL('**/dashboard', { timeout: 60000 });

    // 驗證在 dashboard
    await expect(page).toHaveURL(/dashboard/);

    // 驗證 localStorage
    const userStr = await page.evaluate(() => localStorage.getItem('user'));
    expect(userStr).toBeTruthy();

    const user = JSON.parse(userStr!);
    expect(user.isGuest).toBe(true);
    expect(user.name).toBe('Guest');
  });

  test('2. should display guest info in header dropdown', async () => {
    // 打開 avatar dropdown
    const avatarButton = page.locator('header button.rounded-full').last();
    await avatarButton.click();

    // 驗證訪客顯示名稱
    await expect(page.getByText('訪客用戶')).toBeVisible();
    await expect(page.getByText('尚未註冊')).toBeVisible();

    // 驗證 CTA 存在
    await expect(page.getByText('註冊以永久保存資料')).toBeVisible();

    // 關閉 dropdown
    await page.keyboard.press('Escape');
  });

  test('3. should persist session after page refresh', async () => {
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 仍在 dashboard
    await expect(page).toHaveURL(/dashboard/);
  });

  test('4. should redirect to dashboard when guest visits login page (FR-3)', async () => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // 自動重導回 dashboard
    await expect(page).toHaveURL(/dashboard/);
  });

  test('5. should show danger modal on logout with DELETE confirmation', async () => {
    // 確保回到 dashboard 並且按鈕可見
    await expect(page).toHaveURL(/dashboard/);
    await page.waitForLoadState('networkidle');

    // 解決 React hydration 問題：反覆嘗試點擊直到下拉選單出現
    const avatarButton = page.locator('header button.rounded-full').last();
    const logoutBtn = page.getByText('登出', { exact: true });

    await expect(async () => {
      await avatarButton.click({ force: true });
      await expect(logoutBtn).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 10000 });

    await logoutBtn.click();

    // 驗證警告 dialog
    await expect(page.getByText('確認登出訪客帳號')).toBeVisible();
    await expect(
      page.getByText('登出後將無法找回目前的帳目資料'),
    ).toBeVisible();

    // 確認登出按鈕預設 disabled
    const confirmButton = page.getByRole('button', { name: '確認登出' });
    await expect(confirmButton).toBeDisabled();

    // 輸入小寫 delete → 仍 disabled
    await page.getByPlaceholder('輸入 DELETE 以確認').fill('delete');
    await expect(confirmButton).toBeDisabled();

    // 輸入 DELETE → enabled
    await page.getByPlaceholder('輸入 DELETE 以確認').fill('DELETE');
    await expect(confirmButton).toBeEnabled();

    // 先取消，不登出（留給下一個 test）
    await page.getByRole('button', { name: '取消' }).click();
    await expect(page).toHaveURL(/dashboard/);
  });

  test('6. should logout and redirect to login after DELETE', async () => {
    // 解決 React hydration 問題
    const avatarButton = page.locator('header button.rounded-full').last();
    const logoutBtn = page.getByText('登出', { exact: true });

    await expect(async () => {
      await avatarButton.click({ force: true });
      await expect(logoutBtn).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 10000 });

    await logoutBtn.click();

    // 輸入 DELETE 並確認
    await page.getByPlaceholder('輸入 DELETE 以確認').fill('DELETE');
    await page.getByRole('button', { name: '確認登出' }).click();

    // 等待 redirect
    await page.waitForURL('**/login', { timeout: 10000 });
    await expect(page).toHaveURL(/login/);

    // localStorage 已清除
    await expect(async () => {
      const userStr = await page.evaluate(() => localStorage.getItem('user'));
      expect(userStr).toBeNull();
    }).toPass({ timeout: 5000 });
  });
});

// ═══════════════════════════════════════════════════════════════════
// Group B: Promote Flow（獨立 session）
// ═══════════════════════════════════════════════════════════════════
test.describe('Guest Login — Promote Flow', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(120000);

  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('should promote guest to registered user', async () => {
    // Guest login
    await page.goto('/');
    await page.getByRole('link', { name: '免費開始使用' }).click();
    await page.waitForURL('**/login');
    await page.getByRole('button', { name: '免註冊試用' }).click();
    await page.waitForURL('**/dashboard', { timeout: 60000 });

    // 打開 dropdown → 註冊以永久保存資料
    const avatarButton = page.locator('header button.rounded-full').last();
    await avatarButton.waitFor({ state: 'visible' });
    await avatarButton.click();

    const promoteMenuBtn = page.getByText('註冊以永久保存資料');
    await promoteMenuBtn.waitFor({ state: 'visible' });
    await promoteMenuBtn.click();

    // 等待 promote dialog
    await expect(page.getByText('🎉 註冊以永久保存資料')).toBeVisible();

    // 填寫表單
    const timestamp = Date.now();
    const testEmail = `e2e_promote_${timestamp}@test.com`;

    await page.getByPlaceholder('請輸入您的名字').fill('E2E User');
    await page.getByPlaceholder('請輸入您的電子郵件').fill(testEmail);
    await page.getByPlaceholder('請輸入您的密碼').fill('TestPassword123!');
    await page.getByPlaceholder('請再次輸入您的密碼').fill('TestPassword123!');

    // 完成註冊
    await page.getByRole('button', { name: '完成註冊' }).click();

    // 驗證 localStorage 已更新 (promote 成功後會 reload 頁面)
    await expect(async () => {
      const userStr = await page.evaluate(() => localStorage.getItem('user'));
      expect(userStr).toBeTruthy();
      const user = JSON.parse(userStr!);
      expect(user.isGuest).toBe(false);
      expect(user.name).toBe('E2E User');
      expect(user.email).toBe(testEmail);
    }).toPass({ timeout: 15000 });
  });
});
