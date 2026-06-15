import { test, expect, Page } from '@playwright/test';

/**
 * 拆分交易+標籤 Phase A（Tags）— 帶「字幕」的實際操作示範影片。
 * 對照 docs/specs/split-tags-spec.md（S7/S8/S9、§9.2、§10 Phase A）。
 *
 * 重現（一行指令；前端 :8090 + 後端 :3000 由 config 的 webServer 自動啟動）：
 *   cd apps/frontend && pnpm test:e2e:tags
 * 前置（一次性）：設好 .env + 跑 migration（cd apps/backend && pnpm db:migrate:up）。
 * 詳見 docs/specs/split-tags-spec.md §13。
 *
 * 涵蓋的操作流程：
 *   ① 新增交易時掛標籤：chip 多選既有標籤 + 找不到時 on-the-fly 即時建立（美食）
 *   ② 交易列表：每筆交易顯示彩色標籤 chip
 *   ③ 依標籤篩選：列表只剩含該標籤的交易
 *
 * 註：標籤「管理頁」（設定 → 標籤管理）由 backend tagFlow 整合測試與 frontend tagSettings
 *     覆蓋；此影片用 guest 帳號，而 guest 的 /settings 頁有與標籤無關的既有 SSR 相依
 *     （需通知設定列），故管理頁不納入本影片，改以 API 預先建立既有標籤。
 */

const API = 'http://localhost:3000/api';

// ─── 字幕浮層 ─────────────────────────────────────────────────────────────
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
        'border:1px solid rgba(16,185,129,0.45)',
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

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

test.describe('拆分交易+標籤 Phase A — 標籤功能字幕示範影片', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180_000);

  test('交易掛標籤（含即時建立）→ 列表顯示 → 依標籤篩選', async ({ page }) => {
    await installNarrator(page);

    // ───────────────────────────────────────────────────────────────────
    await test.step('登入 + 種子資料（帳戶 / 既有標籤 / 對照交易）', async () => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle').catch(() => {});
      await narrate(
        page,
        '🎬 標籤（Tags）功能示範\n交易掛標籤（含即時建立）→ 列表顯示彩色 chip → 依標籤篩選',
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

      // 種一個銀行帳戶（交易表單需要可選帳戶）
      const acctId = (
        await (
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
          })
        ).json()
      ).data.id as string;

      // 預先建立兩個既有標籤（之後在交易表單可直接多選）
      await page.request.post(`${API}/tags`, {
        data: { name: '日本旅遊 2026', color: '#3b82f6' },
      });
      await page.request.post(`${API}/tags`, {
        data: { name: '可報帳', color: '#f59e0b' },
      });

      // 種一筆「無標籤」對照交易（之後篩選才看得出差異）
      const cats = (await (await page.request.get(`${API}/category`)).json())
        .data as any[];
      const anyMain = cats
        .flatMap((r) => r.children || [])
        .find((c) => c && c.id);
      await page.request.post(`${API}/transaction`, {
        data: {
          accountId: acctId,
          categoryId: anyMain.id,
          amount: 500,
          description: '對照組（無標籤）',
          date: today(),
          time: '09:00',
          receipt: null,
          paymentFrequency: '單次',
          type: '支出',
        },
      });
    });

    // ───────────────────────────────────────────────────────────────────
    await test.step('① 新增交易並掛標籤（既有多選 + on-the-fly 即時建立）', async () => {
      await page.goto('/transactions');
      await page.waitForLoadState('networkidle').catch(() => {});
      await narrate(
        page,
        '① 新增一筆交易，並在「標籤」欄掛上標籤',
        2200,
      );
      await page.getByRole('button', { name: '新增交易' }).click();

      const sheet = page.getByRole('dialog');

      // 主分類（預設支出）+ 視情況選子分類
      await sheet.getByRole('combobox', { name: '主分類' }).click();
      await page.getByRole('option').first().click();
      const sub = sheet.getByRole('combobox', { name: '子分類' });
      if (await sub.isEnabled()) {
        await sub.click();
        await page.getByRole('option').first().click();
      }

      // 帳戶
      await sheet.getByRole('combobox', { name: '帳戶' }).click();
      await page.getByRole('option', { name: '示範錢包' }).click();

      // 金額（此表單的金額 input 被包一層 div，label 關聯到 div 而非 input，
      // 故不用 accessible name，直接取表單內第一個 number input）
      await sheet.locator('input[type="number"]').first().fill('1200');

      await narrate(
        page,
        '打開「標籤」選單：可多選既有標籤，找不到的可即時建立',
        2800,
      );

      // 開啟標籤多選 popover
      await sheet.getByRole('button', { name: '標籤', exact: true }).click();
      const pop = page.locator('[data-radix-popper-content-wrapper]');
      await expect(pop.getByPlaceholder('搜尋或建立標籤')).toBeVisible();

      // 選既有標籤
      await pop.getByText('日本旅遊 2026').click();
      await narrate(page, '選取既有標籤「日本旅遊 2026」', 1600);

      // on-the-fly 即時建立新標籤「美食」
      await pop.getByPlaceholder('搜尋或建立標籤').fill('美食');
      await pop.getByText(/建立「美食」/).click();
      await narrate(
        page,
        '輸入「美食」→ 直接「建立」即時新增並選取（不必先去設定頁建立）',
        2800,
      );

      // 再點一次觸發鈕收合選單（exact 避免匹配到 chip 的「移除標籤…」按鈕）
      await sheet.getByRole('button', { name: '標籤', exact: true }).click();
      const chips = sheet.locator('[data-slot="badge"]');
      await expect(chips.filter({ hasText: '日本旅遊 2026' })).toBeVisible();
      await expect(chips.filter({ hasText: '美食' })).toBeVisible();

      await narrate(page, '兩個標籤已掛上，儲存交易', 1800);
      await sheet.getByRole('button', { name: '儲存交易' }).click();
      await expect(sheet).toBeHidden({ timeout: 10_000 });
    });

    // ───────────────────────────────────────────────────────────────────
    await test.step('② 列表顯示彩色標籤 chip', async () => {
      await page.getByTestId('tab-list').click();
      await narrate(page, '② 交易列表：每筆交易底下顯示彩色標籤 chip', 2400);
      const table = page.getByTestId('transaction-table');
      await expect(table.getByText('日本旅遊 2026')).toBeVisible({
        timeout: 10_000,
      });
      await expect(table.getByText('美食', { exact: true })).toBeVisible();
      // 對照組那筆沒有標籤
      await expect(table.getByText('對照組（無標籤）')).toBeVisible();
    });

    // ───────────────────────────────────────────────────────────────────
    await test.step('③ 依標籤篩選', async () => {
      await narrate(page, '③ 用上方「標籤」篩選器：只看含「美食」的交易', 2600);
      await page.getByRole('button', { name: /標籤/ }).click();
      const fpop = page.locator('[data-radix-popper-content-wrapper]');
      await fpop.getByText('美食', { exact: true }).click();
      await page.keyboard.press('Escape');

      const table = page.getByTestId('transaction-table');
      await expect(table.getByText('美食', { exact: true })).toBeVisible({
        timeout: 10_000,
      });
      await expect(table.getByText('對照組（無標籤）')).toHaveCount(0);

      await narrate(
        page,
        '✅ 標籤示範完成：掛標籤（含即時建立）/ 列表彩色 chip / 依標籤篩選 皆正常運作',
        3400,
      );
    });
  });
});
