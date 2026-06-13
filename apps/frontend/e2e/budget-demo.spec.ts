import { test, expect, Page } from '@playwright/test';

/**
 * 預算（YNAB 信封預算）完整操作情境 — 帶「字幕」的示範影片。
 * 對照 docs/specs/budget-ynab-spec.md（§5 計算、§6 API、§7 介面、§3.2 轉帳邊界）。
 *
 * 執行（前端會自動起在 :8090、video:'on'）：
 *   cd apps/frontend && pnpm exec playwright test --config=playwright.budget.config.ts
 * 前置：後端 :3000 已啟動，且 ORIGIN_URL=http://localhost:8090
 *
 * 「字幕」做法：在頁面注入一條固定字幕浮層（pointer-events:none，不擋操作），
 * 每一步用 narrate() 更新文字並停留數秒，因為 Playwright 錄的是整個頁面，字幕就會出現在影片裡。
 *
 * 涵蓋的操作情境（= 預算功能全部行為）：
 *   1. 啟用預算（選起始月、勾選參與預算的帳戶）
 *   2. 可分配金額 RTA 由「真實帳戶起始餘額」推導
 *   3. 分類現金超支（負 Available）與超支提示
 *   4. 月份切換 + 跨月結轉：上月超支於下月從 RTA 扣除
 *   5. RTA 組成明細（起始餘額 / 累計收入 / 累計已分配 / 前月超支扣除）
 *   6. 行內分配 Assigned（即時更新 optimistic）
 *   7. 分類間轉移預算（不影響 RTA）
 *   8. 從 RTA 直接撥款給分類
 *   9. 分類交易明細（該月交易列表）
 *  10. 轉帳邊界規則：跨邊界轉出→「轉出（未分類）」、跨邊界轉入→RTA、內部轉帳零影響
 */

// ─── 測試資料：全域分類（userId=null，DB 既有）────────────────────────────
const CAT = {
  飲食: '115f381d-e49c-4198-a037-af6f457a5fe2',
  交通: '1d0cbd7c-6ad8-4772-9277-9d7d7d86ed2a',
  娛樂: '7bea2120-6040-47a6-9058-96a074b96cc1',
  薪水: '10ac0ca0-e05d-4b19-a859-c50e0a374074',
} as const;

const API = 'http://localhost:3000/api';

// ─── 字幕浮層 ─────────────────────────────────────────────────────────────
/** 在每個頁面（含換頁後）注入字幕條與 window.__narrate() */
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

/** 更新字幕並停留，讓觀看者讀得到（示範影片刻意停頓） */
async function narrate(page: Page, text: string, holdMs = 1700) {
  await page.evaluate((t) => (window as any).__narrate?.(t), text);
  await page.waitForTimeout(holdMs);
}

// ─── 日期工具 ─────────────────────────────────────────────────────────────
function prevMonthOf(m1st: string): string {
  let [y, m] = m1st.split('-').map(Number) as [number, number, number];
  m--;
  if (m < 1) {
    m = 12;
    y--;
  }
  return `${y}-${String(m).padStart(2, '0')}-01`;
}
const dayOf = (m1st: string, d: number) =>
  `${m1st.slice(0, 7)}-${String(d).padStart(2, '0')}`;
const CN_MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
const monthLabel = (m1st: string) => {
  const [y, m] = m1st.split('-').map(Number);
  return `${y} 年 ${CN_MONTHS[m! - 1]}`;
};

test.describe('YNAB 預算 — 完整操作情境（字幕示範影片）', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180_000);

  test('啟用→RTA→超支→跨月結轉→分配→轉移預算→交易明細→轉帳邊界', async ({
    page,
  }) => {
    await installNarrator(page);

    let currentMonth = '';
    let prevMonth = '';

    // ───────────────────────────────────────────────────────────────────
    await test.step('登入測試帳號', async () => {
      await page.goto('/login');
      await narrate(
        page,
        '🎬 預算操作示範：把錢分配到各支出分類（像分裝進信封）\n先建立一個全新的訪客帳號作為乾淨的測試環境',
        2200,
      );
      await page.getByRole('button', { name: '免註冊試用' }).click();
      await page.waitForURL('**/dashboard', { timeout: 60_000 });
    });

    // ───────────────────────────────────────────────────────────────────
    await test.step('準備情境資料（API 種子）', async () => {
      await narrate(
        page,
        '準備情境資料：\n• 永豐銀行（預算帳戶，起始 $100,000）\n• 永豐證券（非預算的證券戶）\n• 玉山銀行（預算帳戶）\n• 上月餐費、本月薪水與交通支出、三筆轉帳',
        3200,
      );

      const status = await (await page.request.get(`${API}/budget`)).json();
      currentMonth = status.data.currentMonth as string;
      prevMonth = prevMonthOf(currentMonth);

      const mkAcc = async (
        name: string,
        type: string,
        balance: number,
        onBudget: boolean,
        color: string,
      ) =>
        (
          await (
            await page.request.post(`${API}/account`, {
              data: {
                name,
                type,
                balance,
                currencyCode: 'TWD',
                icon: 'wallet',
                color,
                isArchived: false,
                onBudget,
              },
            })
          ).json()
        ).data.id as string;

      const bank = await mkAcc('永豐銀行', '銀行', 100000, true, '#10b981');
      const trk = await mkAcc('永豐證券', '證券戶', 5000, false, '#6366f1');
      const bank2 = await mkAcc('玉山銀行', '銀行', 0, true, '#0ea5e9');

      const tx = (
        accountId: string,
        categoryId: string,
        amount: number,
        type: '收入' | '支出',
        date: string,
        description: string,
      ) =>
        page.request.post(`${API}/transaction`, {
          data: {
            accountId,
            categoryId,
            amount,
            description,
            date,
            time: '12:00',
            receipt: null,
            paymentFrequency: '單次',
            type,
          },
        });
      const xfer = (
        from: string,
        to: string,
        amount: number,
        description: string,
      ) =>
        page.request.post(`${API}/transaction/transfer`, {
          data: {
            accountId: from,
            targetAccountId: to,
            categoryId: CAT.飲食,
            amount,
            description,
            date: dayOf(currentMonth, 12),
            time: '10:00',
            receipt: null,
            paymentFrequency: '單次',
            type: '操作',
          },
        });

      // 上月：飲食 5,000（不分配 → 現金超支）
      await tx(bank, CAT.飲食, 5000, '支出', dayOf(prevMonth, 20), '五月餐費');
      // 本月：薪水 50,000、交通 2,000
      await tx(bank, CAT.薪水, 50000, '收入', dayOf(currentMonth, 5), '本月薪水');
      await tx(bank, CAT.交通, 2000, '支出', dayOf(currentMonth, 10), '捷運通勤');
      // 本月三種轉帳
      await xfer(bank, trk, 1000, '轉到證券戶'); // 跨邊界轉出 → 未分類
      await xfer(trk, bank, 3000, '證券提領'); // 跨邊界轉入 → RTA
      await xfer(bank, bank2, 5000, '內部調度'); // 內部 → 零影響
    });

    // ───────────────────────────────────────────────────────────────────
    await test.step('啟用預算', async () => {
      await page.goto('/budget');
      await narrate(
        page,
        '進入「預算」頁，目前尚未啟用，顯示引導畫面',
        2000,
      );
      await expect(page.getByText('開始掌控你的每一分錢')).toBeVisible({
        timeout: 15_000,
      });

      await page.getByRole('button', { name: '啟用預算' }).click();
      await narrate(
        page,
        '把起始月設為「上月」，並確認哪些帳戶要參與預算\n（證券戶預設不參與，只記淨值）',
        2600,
      );
      const dialog = page.getByRole('dialog');
      await dialog.locator('input[type="month"]').fill(prevMonth.slice(0, 7));
      await expect(dialog.getByText('永豐銀行')).toBeVisible();
      await dialog.getByRole('button', { name: '啟用預算' }).click();

      await expect(page.getByTestId('rta-amount')).toBeVisible({ timeout: 15_000 });
    });

    // ───────────────────────────────────────────────────────────────────
    await test.step('上月：RTA 來自真實帳戶 + 現金超支', async () => {
      await expect(page.getByTestId('month-label')).toHaveText(monthLabel(prevMonth));
      await narrate(
        page,
        '「可分配金額（RTA）」= $100,000\n這不是憑空輸入，而是預算帳戶的真實起始餘額',
        2800,
      );
      await expect(page.getByTestId('rta-amount')).toHaveText('$100,000');

      const shiyi = page.locator('[data-testid=budget-row][data-category-name="飲食"]');
      await narrate(
        page,
        '上月「飲食」花了 $5,000 卻沒分配預算\n→ 可用顯示 -$5,000（現金超支，紅色）',
        2800,
      );
      await expect(shiyi.getByTestId('activity-cell')).toHaveText('-$5,000');
      await expect(shiyi.getByTestId('available-cell')).toHaveText('-$5,000');

      await narrate(
        page,
        '出現超支提示：月底負值會歸零，差額會從「下個月」的 RTA 扣除',
        2800,
      );
      await expect(page.getByTestId('overspending-banner')).toBeVisible();

      await narrate(page, '目前停在起始月，無法再往前一個月（上一頁鈕已停用）', 2200);
      await expect(page.getByTestId('month-prev')).toBeDisabled();
    });

    // ───────────────────────────────────────────────────────────────────
    await test.step('切到本月：跨月結轉與 RTA 明細', async () => {
      await narrate(page, '點「下一月」切換到本月', 1500);
      await page.getByTestId('month-next').click();
      await expect(page.getByTestId('month-label')).toHaveText(monthLabel(currentMonth));

      await narrate(
        page,
        '本月 RTA = $148,000\n= 起始 $100,000 ＋ 累計收入 $53,000 − 已分配 $0 − 前月超支 $5,000',
        3400,
      );
      await expect(page.getByTestId('rta-amount')).toHaveText('$148,000', { timeout: 10_000 });
      await expect(page.getByTestId('month-next')).toBeDisabled();

      await narrate(page, '點 ⓘ 看 RTA 的組成明細', 1500);
      await page.getByTestId('rta-info').click();
      await expect(page.getByText('RTA 組成')).toBeVisible();
      await narrate(
        page,
        '明細清楚列出：起始餘額、累計收入 $53,000、累計已分配、\n以及「前月超支扣除 -$5,000」（上月的現金超支在這裡扣回）',
        3600,
      );
      // 限定在 RTA popover 容器內斷言（避免與字幕浮層的相同文字相撞）
      const breakdown = page.locator('[data-radix-popper-content-wrapper]');
      await expect(breakdown.getByText('前月超支扣除')).toBeVisible();
      await expect(breakdown.getByText('-$5,000')).toBeVisible();
      await expect(breakdown.getByText('$53,000')).toBeVisible();
      await page.keyboard.press('Escape');
    });

    // ───────────────────────────────────────────────────────────────────
    await test.step('行內分配 Assigned（即時更新）', async () => {
      const jiaotong = page.locator('[data-testid=budget-row][data-category-name="交通"]');
      await narrate(
        page,
        '本月「交通」花了 $2,000，但還沒分配 → 可用 -$2,000',
        2600,
      );
      await expect(jiaotong.getByTestId('activity-cell')).toHaveText('-$2,000');
      await expect(jiaotong.getByTestId('available-cell')).toHaveText('-$2,000');

      await narrate(page, '直接在欄位上輸入 $5,000 分配給交通，按 Enter 送出', 2400);
      const cell = jiaotong.getByTestId('assigned-cell');
      await cell.getByRole('button').click();
      const input = cell.getByRole('spinbutton');
      await input.fill('5000');
      await input.press('Enter');

      await narrate(
        page,
        '畫面即時更新（optimistic）：\n交通可用 = $5,000 − 已花 $2,000 = $3,000，RTA 同步降為 $143,000',
        3200,
      );
      await expect(cell.getByRole('button')).toHaveText('$5,000');
      await expect(jiaotong.getByTestId('available-cell')).toHaveText('$3,000');
      await expect(page.getByTestId('rta-amount')).toHaveText('$143,000');
    });

    // ───────────────────────────────────────────────────────────────────
    await test.step('分類間轉移預算（不影響 RTA）', async () => {
      const jiaotong = page.locator('[data-testid=budget-row][data-category-name="交通"]');
      const yule = page.locator('[data-testid=budget-row][data-category-name="娛樂"]');

      await narrate(page, '點交通的「可用」金額，開啟轉移預算面板', 1800);
      await jiaotong.getByTestId('available-cell').click();
      await expect(page.getByText('轉移預算', { exact: true })).toBeVisible();

      await narrate(page, '從交通搬 $1,000 到娛樂', 1800);
      await page.getByRole('combobox').nth(1).click(); // 對象
      await page.getByRole('option', { name: '娛樂' }).click();
      await page.getByPlaceholder('0').fill('1000');
      await page.getByRole('button', { name: '確認轉移' }).click();

      await narrate(
        page,
        '轉移預算只在分類之間移動：交通 $2,000、娛樂 $1,000\nRTA 不受影響（仍 $143,000）',
        3000,
      );
      await expect(jiaotong.getByTestId('available-cell')).toHaveText('$2,000', { timeout: 10_000 });
      await expect(yule.getByTestId('available-cell')).toHaveText('$1,000');
      await expect(page.getByTestId('rta-amount')).toHaveText('$143,000');
    });

    // ───────────────────────────────────────────────────────────────────
    await test.step('從 RTA 直接撥款給分類', async () => {
      const shiyi = page.locator('[data-testid=budget-row][data-category-name="飲食"]');
      await narrate(page, '也可以從 RTA 直接撥款：點飲食的「可用」開面板', 2000);
      await shiyi.getByTestId('available-cell').click();
      await expect(page.getByText('轉移預算', { exact: true })).toBeVisible();

      await narrate(page, '方向改成「移入此分類」，對象維持「可分配金額(RTA)」，金額 $2,000', 2600);
      await page.getByRole('combobox').nth(0).click(); // 方向
      await page.getByRole('option', { name: '移入此分類' }).click();
      await page.getByPlaceholder('0').fill('2000');
      await page.getByRole('button', { name: '確認轉移' }).click();

      await narrate(
        page,
        '飲食分配 $2,000、可用 $2,000；RTA 由 $143,000 降為 $141,000',
        3000,
      );
      await expect(shiyi.getByTestId('assigned-cell').getByRole('button')).toHaveText('$2,000', { timeout: 10_000 });
      await expect(shiyi.getByTestId('available-cell')).toHaveText('$2,000');
      await expect(page.getByTestId('rta-amount')).toHaveText('$141,000');
    });

    // ───────────────────────────────────────────────────────────────────
    await test.step('分類交易明細', async () => {
      const jiaotong = page.locator('[data-testid=budget-row][data-category-name="交通"]');
      await narrate(page, '點「收支」金額，查看該分類本月的交易明細', 2000);
      await jiaotong.getByTestId('activity-cell').click();

      const sheet = page.getByRole('dialog');
      await expect(sheet.getByText('交通 · 交易明細')).toBeVisible();
      await narrate(page, '明細列出本月交通的每一筆支出（這裡是「捷運通勤 $2,000」）', 2800);
      await expect(sheet.getByText('捷運通勤')).toBeVisible();
      await expect(sheet.getByText('$2,000').first()).toBeVisible();
      await page.keyboard.press('Escape');
    });

    // ───────────────────────────────────────────────────────────────────
    await test.step('轉帳邊界規則', async () => {
      await narrate(
        page,
        '轉帳的三條規則（規格 §3.2）：',
        1600,
      );
      const row = page.getByTestId('unclassified-row');
      await expect(row).toBeVisible();
      await narrate(
        page,
        '① 預算帳戶 → 證券戶（非預算）的轉出 $1,000\n歸入「轉出（未分類）」虛擬列，收支與可用皆 -$1,000',
        3400,
      );
      await expect(row.getByText('轉出（未分類）')).toBeVisible();
      await expect(row.getByText('-$1,000')).toHaveCount(2);

      await narrate(
        page,
        '② 證券戶 → 預算帳戶的轉入 $3,000\n視為收入，已包含在前面的「累計收入 $53,000」裡',
        3400,
      );
      await narrate(
        page,
        '③ 兩個預算帳戶之間的內部轉帳 $5,000\n對預算「零影響」——RTA 仍是 $141,000（沒被當成收入或支出）',
        3600,
      );
      await expect(page.getByTestId('rta-amount')).toHaveText('$141,000');

      await narrate(
        page,
        '✅ 示範完成：RTA 由真實帳戶推導、跨月結轉、分配/轉移預算、轉帳邊界規則皆正確',
        3200,
      );
    });
  });
});
