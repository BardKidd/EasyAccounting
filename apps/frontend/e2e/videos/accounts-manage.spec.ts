import { test, expect } from '@playwright/test';
import {
  installDemoOverlay,
  narrate,
  chapter,
  click,
  type,
  guestLogin,
  saveVideo,
  API,
} from './support/demo';

/**
 * 教學影片 #10 — 帳戶 · 管理（Phase 1，§7）。
 * 流程：編輯帳戶（改餘額）→ 封存 → 顯示已封存 → 解除封存。
 */

const SLUG = 'accounts-manage';

test.describe.configure({ mode: 'serial' });
test.setTimeout(180_000);

test.afterEach(async ({ page }) => {
  await saveVideo(page, SLUG);
});

test('編輯帳戶 → 封存 → 顯示已封存 → 解除封存', async ({ page }) => {
  await installDemoOverlay(page);

  await page.goto('/login');
  await page.waitForLoadState('networkidle').catch(() => {});
  await chapter(page, '帳戶 · 管理', 1, 3);
  await narrate(page, '🎬 帳戶管理：編輯、封存與解除封存', 2600);
  await guestLogin(page);
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });

  // 種一個帳戶（只一個 → More 選單唯一）
  await page.request.post(`${API}/account`, {
    data: { name: '永豐銀行', type: '銀行', balance: 50000, currencyCode: 'TWD', icon: 'wallet', color: '#10b981', isArchived: false, onBudget: true },
  });

  await page.goto('/accounts');
  await page.waitForLoadState('networkidle').catch(() => {});
  await expect(page.getByText('永豐銀行')).toBeVisible({ timeout: 10_000 });

  // ── 編輯 ──
  await narrate(page, '把游標移到帳戶上，點右側「⋯」選單', 2400);
  await click(page, page.getByRole('button', { name: 'Open menu' }));
  await narrate(page, '選「編輯」', 1600);
  await click(page, page.getByRole('menuitem', { name: '編輯' }));
  const dialog = page.getByRole('dialog');
  await narrate(page, '把目前餘額改成 $80,000，按「更新帳戶」', 2600);
  await type(page, dialog.locator('#balance'), '80000');
  await click(page, dialog.getByRole('button', { name: '更新帳戶' }));
  await expect(dialog).toBeHidden({ timeout: 10_000 });
  await expect(page.getByTestId('account-balance').first()).toContainText('80,000', { timeout: 10_000 });

  // ── 封存 ──
  await chapter(page, '帳戶 · 管理', 2, 3);
  await narrate(page, '再開「⋯」選單，選「封存帳戶」', 2400);
  await click(page, page.getByRole('button', { name: 'Open menu' }));
  await click(page, page.getByRole('menuitem', { name: '封存帳戶' }));
  await narrate(page, '確認封存', 1600);
  await click(page, page.getByRole('button', { name: '確認封存' }));
  await narrate(page, '封存後，帳戶從預設清單隱藏', 2400);
  await expect(page.getByText('永豐銀行')).toHaveCount(0, { timeout: 10_000 });

  // ── 顯示已封存 + 解除封存 ──
  await chapter(page, '帳戶 · 管理', 3, 3);
  await narrate(page, '打開「顯示已封存帳戶」開關，被封存的帳戶會再次出現', 2800);
  await click(page, page.getByLabel('顯示已封存帳戶'));
  await expect(page.getByText('永豐銀行')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('已封存').first()).toBeVisible();

  await narrate(page, '從「⋯」選單選「解除封存」即可恢復使用', 2600);
  await click(page, page.getByRole('button', { name: 'Open menu' }));
  await click(page, page.getByRole('menuitem', { name: '解除封存' }));
  await narrate(page, '✅ 帳戶管理完成：編輯餘額 → 封存 → 顯示已封存 → 解除封存', 3200);
});
