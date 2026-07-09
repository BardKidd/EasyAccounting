import { test, expect } from '@playwright/test';
import {
  installDemoOverlay,
  narrate,
  chapter,
  click,
  type,
  guestLogin,
  saveVideo,
} from './support/demo';

/**
 * 教學影片 #9 — 帳戶 · 新增（Phase 1，§7）。
 * 流程：新增「銀行」帳戶 → 新增「信用卡」帳戶（展開結帳日/繳款日/信用額度）。
 */

const SLUG = 'accounts-create';

test.describe.configure({ mode: 'serial' });
test.setTimeout(180_000);

test.afterEach(async ({ page }) => {
  await saveVideo(page, SLUG);
});

test('新增銀行帳戶 + 信用卡帳戶（含信用卡額外欄位）', async ({ page }) => {
  await installDemoOverlay(page);

  await page.goto('/login');
  await page.waitForLoadState('networkidle').catch(() => {});
  await chapter(page, '帳戶 · 新增', 1, 2);
  await narrate(page, '🎬 帳戶管理：建立你的銀行、現金、信用卡等帳戶', 2600);
  await guestLogin(page);
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });

  await page.goto('/accounts');
  await page.waitForLoadState('networkidle').catch(() => {});

  // ── 銀行帳戶 ──
  await narrate(page, '點「新增帳戶」開啟表單', 2000);
  await click(page, page.getByRole('button', { name: '新增帳戶' }));
  const dialog = page.getByRole('dialog');
  await narrate(page, '輸入名稱、選擇類型「銀行」、填初始餘額', 2600);
  await type(page, dialog.getByPlaceholder('例如: 薪轉戶'), '永豐銀行');
  await click(page, dialog.getByRole('combobox').first());
  await click(page, page.getByRole('option', { name: '銀行' }));
  await type(page, dialog.locator('#balance'), '50000');
  await narrate(page, '按「建立帳戶」', 1600);
  await click(page, dialog.getByRole('button', { name: '建立帳戶' }));
  await expect(dialog).toBeHidden({ timeout: 10_000 });
  await expect(page.getByText('永豐銀行')).toBeVisible({ timeout: 10_000 });

  // ── 信用卡帳戶 ──
  await chapter(page, '帳戶 · 新增', 2, 2);
  await narrate(page, '再新增一個「信用卡」帳戶', 2000);
  await click(page, page.getByRole('button', { name: '新增帳戶' }));
  const dialog2 = page.getByRole('dialog');
  await type(page, dialog2.getByPlaceholder('例如: 薪轉戶'), '國泰 Visa');
  await click(page, dialog2.getByRole('combobox').first());
  await click(page, page.getByRole('option', { name: '信用卡' }));

  await narrate(page, '選「信用卡」後會展開專屬欄位：信用額度、結帳日、繳款日', 2800);
  await expect(dialog2.getByText('信用卡設定')).toBeVisible();
  // 右欄第一個數字輸入＝信用額度（左欄第一個是初始餘額）
  await type(page, dialog2.locator('input[type="number"]').nth(1), '80000');
  // 結帳日 / 繳款日（type、currency 之後的第 3、4 個 combobox）
  await click(page, dialog2.getByRole('combobox').nth(2));
  await click(page, page.getByRole('option', { name: '5日', exact: true }));
  await click(page, dialog2.getByRole('combobox').nth(3));
  await click(page, page.getByRole('option', { name: '20日', exact: true }));

  await narrate(page, '按「建立帳戶」完成', 1600);
  await click(page, dialog2.getByRole('button', { name: '建立帳戶' }));
  await expect(dialog2).toBeHidden({ timeout: 10_000 });
  await expect(page.getByText('國泰 Visa')).toBeVisible({ timeout: 10_000 });

  await narrate(page, '✅ 帳戶新增完成：銀行帳戶與信用卡帳戶（含結帳/繳款日、信用額度）', 3200);
});
