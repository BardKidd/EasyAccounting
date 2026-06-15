import { test, expect, Page } from '@playwright/test';

/**
 * 拆分交易 Phase B（Split）— 帶「字幕」的實際操作示範影片。
 * 對照 docs/specs/split-tags-spec.md（S2–S6、§9.1、§10 Phase B）。
 *
 * 重現（一行指令；前端 :8090 + 後端 :3000 由 config 的 webServer 自動啟動）：
 *   cd apps/frontend && pnpm test:e2e:split
 * 前置（一次性）：設好 .env + 跑 migration（cd apps/backend && pnpm db:migrate:up）。
 *
 * 涵蓋操作流程：
 *   ① 新增交易、輸入總額，開啟「拆分成多個分類」
 *   ② 子項列分別選分類、填金額；即時加總顯示「剩餘」→「已配平」
 *   ③ 儲存後，列表顯示「拆分 N」標記
 */

const API = 'http://localhost:3000/api';

async function installNarrator(page: Page) {
  await page.addInitScript(() => {
    const ID = '__e2e_narrator__';
    function ensure(): HTMLElement {
      let bar = document.getElementById(ID);
      if (bar) return bar;
      bar = document.createElement('div');
      bar.id = ID;
      bar.style.cssText = [
        'position:fixed',
        'left:50%',
        'bottom:28px',
        'transform:translateX(-50%)',
        'max-width:82%',
        'padding:14px 30px',
        'background:rgba(15,23,42,0.94)',
        'color:#f8fafc',
        'font-size:21px',
        'font-weight:600',
        'line-height:1.55',
        'letter-spacing:0.3px',
        'border-radius:16px',
        'z-index:2147483647',
        'pointer-events:none',
        'box-shadow:0 10px 40px rgba(0,0,0,0.45)',
        'border:1px solid rgba(99,102,241,0.5)',
        'font-family:system-ui,-apple-system,"PingFang TC","Microsoft JhengHei",sans-serif',
        'text-align:center',
        'white-space:pre-wrap',
      ].join(';');
      (document.body || document.documentElement).appendChild(bar);
      return bar;
    }
    (window as any).__narrate = (text: string) => {
      ensure().textContent = text;
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', ensure);
    } else {
      ensure();
    }
  });
}

async function narrate(page: Page, text: string, holdMs = 2000) {
  await page.evaluate((t) => (window as any).__narrate?.(t), text);
  await page.waitForTimeout(holdMs);
}

test.describe('拆分交易 Phase B — 拆分功能字幕示範影片', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180_000);

  test('開啟拆分 → 子項分類/金額 → 即時配平 → 儲存 → 列表標記', async ({
    page,
  }) => {
    await installNarrator(page);

    await test.step('登入 + 種子帳戶', async () => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle').catch(() => {});
      await narrate(
        page,
        '🎬 拆分交易（Split）功能示範\n一筆交易拆成多個分類（如 全聯 1200 → 食材 800 + 日用品 400）',
        2800,
      );
      const guestBtn = page.getByRole('button', { name: '免註冊試用' });
      await guestBtn.waitFor({ state: 'visible' });
      for (let i = 0; i < 4; i++) {
        await guestBtn.click().catch(() => {});
        try {
          await page.waitForURL('**/dashboard', { timeout: 25_000 });
          break;
        } catch {
          if (page.url().includes('/dashboard')) break;
          await page.waitForTimeout(1500);
        }
      }
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });

      await page.request.post(`${API}/account`, {
        data: {
          name: '示範錢包',
          type: '銀行',
          balance: 50000,
          currencyCode: 'TWD',
          icon: 'wallet',
          color: '#10b981',
          isArchived: false,
          onBudget: true,
        },
      });
    });

    await test.step('① 新增交易、輸入總額、開啟拆分', async () => {
      await page.goto('/transactions');
      await page.waitForLoadState('networkidle').catch(() => {});
      await narrate(page, '① 新增一筆交易，輸入總額後開啟「拆分」', 2200);
      await page.getByRole('button', { name: '新增交易' }).click();

      const sheet = page.getByRole('dialog');

      // 帳戶
      await sheet.getByRole('combobox', { name: '帳戶' }).click();
      await page.getByRole('option', { name: '示範錢包' }).click();

      // 總額（拆分前的金額 input 即第一個 number input）
      await sheet.locator('input[type="number"]').first().fill('1200');

      await narrate(
        page,
        '打開「拆分成多個分類」開關\n頂層分類隱藏，改用子項列逐項分配',
        2600,
      );
      await sheet.getByRole('switch').click();
      await expect(sheet.getByTestId('split-editor')).toBeVisible();
    });

    await test.step('② 子項分類/金額 + 即時配平', async () => {
      const sheet = page.getByRole('dialog');
      const editor = sheet.getByTestId('split-editor');

      // 子項 1：第一個分類 + 800
      await editor.getByRole('combobox').nth(0).click();
      await page.getByRole('option').first().click();
      await editor.locator('input[type="number"]').nth(0).fill('800');
      await narrate(
        page,
        '子項 1：選分類、填 800\n下方即時顯示「剩餘 400」（未配平為琥珀色）',
        2800,
      );
      await expect(editor.getByText(/剩餘\s*400/)).toBeVisible();

      // 子項 2：第二個分類 + 400
      await editor.getByRole('combobox').nth(1).click();
      await page.getByRole('option').nth(1).click();
      await editor.locator('input[type="number"]').nth(1).fill('400');
      await narrate(
        page,
        '子項 2：選分類、填 400\n加總 = 總額 → 顯示「已配平」（綠色），即可儲存',
        2800,
      );
      await expect(editor.getByText('已配平')).toBeVisible();

      await sheet.getByRole('button', { name: '儲存交易' }).click();
      await expect(sheet).toBeHidden({ timeout: 10_000 });
    });

    await test.step('③ 列表顯示「拆分」標記', async () => {
      await page.getByTestId('tab-list').click();
      await narrate(page, '③ 交易列表：該筆顯示「拆分 2」標記', 2400);
      const table = page.getByTestId('transaction-table');
      await expect(table.getByText(/拆分\s*2/)).toBeVisible({
        timeout: 10_000,
      });
      await narrate(
        page,
        '✅ 拆分示範完成：開啟拆分 → 子項分類/金額 → 即時配平 → 列表標記',
        3200,
      );
    });
  });
});
