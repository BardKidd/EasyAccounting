import { test, expect, Page } from '@playwright/test';

/**
 * 預算 Phase 2 新功能 — 帶「字幕」的示範影片。
 * 對照 docs/specs/budget-ynab-spec.md §9 Phase 2（P2-D1…D10）。
 *
 * 執行（前端會自動起在 :8090、video:'on'）：
 *   cd apps/frontend && pnpm exec playwright test --config=playwright.budget.config.ts budget-phase2-demo
 * 前置：後端 :3000 已啟動，且 ORIGIN_URL=http://localhost:8090
 *
 * 涵蓋的 Phase 2 新功能：
 *   ① 未來月份預先分配（可導覽未來月、「未來」徽章、預先分配即扣該月 RTA）
 *   ② 退款回補信封（收入掛支出分類 → 回補該信封，不灌進 RTA）
 *   ③ 跨邊界轉帳選填分類（轉出選了支出分類 → 歸入該信封，而非「轉出（未分類）」）
 *   ④ Targets + Underfunded + Auto-Assign（設定目標、顯示缺口、一鍵補足不足額）
 *   ⑤ 信用卡完整機制（刷卡覆蓋 covered、信用超支不扣 RTA、信用卡付款信封、撥備、還款）
 */

// ─── 全域分類（userId=null，DB 既有；與 Phase 1 demo 相同）─────────────────
const CAT = {
  飲食: '115f381d-e49c-4198-a037-af6f457a5fe2',
  交通: '1d0cbd7c-6ad8-4772-9277-9d7d7d86ed2a',
  娛樂: '7bea2120-6040-47a6-9058-96a074b96cc1',
  薪水: '10ac0ca0-e05d-4b19-a859-c50e0a374074',
} as const;

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

async function narrate(page: Page, text: string, holdMs = 1900) {
  await page.evaluate((t) => (window as any).__narrate?.(t), text);
  await page.waitForTimeout(holdMs);
}

// ─── 日期工具 ─────────────────────────────────────────────────────────────
function nextMonthOf(m1st: string): string {
  let [y, m] = m1st.split('-').map(Number) as [number, number];
  m++;
  if (m > 12) {
    m = 1;
    y++;
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

test.describe('YNAB 預算 Phase 2 — 新功能字幕示範影片', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180_000);

  test('未來月份 → 退款回補 → 轉帳分類 → 目標/自動分配 → 信用卡機制', async ({
    page,
  }) => {
    await installNarrator(page);

    let currentMonth = '';
    let futureMonth = '';

    // ───────────────────────────────────────────────────────────────────
    await test.step('登入 + 種子資料', async () => {
      await page.goto('/login');
      await narrate(
        page,
        '🎬 預算 Phase 2 新功能示範\n未來月份預先分配 / 退款回補 / 轉帳分類 / 目標與自動分配 / 信用卡機制',
        2600,
      );
      await page.getByRole('button', { name: '免註冊試用' }).click();
      await page.waitForURL('**/dashboard', { timeout: 60_000 });

      const status = await (await page.request.get(`${API}/budget`)).json();
      currentMonth = status.data.currentMonth as string;
      futureMonth = nextMonthOf(currentMonth);

      const mkAcc = async (
        name: string,
        type: string,
        balance: number,
        onBudget: boolean,
        color: string,
        creditCardDetail?: object,
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
                ...(creditCardDetail ? { creditCardDetail } : {}),
              },
            })
          ).json()
        ).data.id as string;

      const bank = await mkAcc('永豐銀行', '銀行', 100000, true, '#10b981');
      const trk = await mkAcc('永豐證券', '證券戶', 5000, false, '#6366f1');
      const visa = await mkAcc('國泰 Visa', '信用卡', 0, true, '#6366f1', {
        statementDate: 5,
        paymentDueDate: 20,
        creditLimit: 80000,
      });

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
        categoryId: string,
        description: string,
      ) =>
        page.request.post(`${API}/transaction/transfer`, {
          data: {
            accountId: from,
            targetAccountId: to,
            categoryId,
            amount,
            description,
            date: dayOf(currentMonth, 12),
            time: '10:00',
            receipt: null,
            paymentFrequency: '單次',
            type: '操作',
          },
        });

      // 收入
      await tx(bank, CAT.薪水, 50000, '收入', dayOf(currentMonth, 5), '本月薪水');
      // 飲食：支出 3,000 後退款 1,000（收入掛「飲食」支出分類）→ 退款回補
      await tx(bank, CAT.飲食, 3000, '支出', dayOf(currentMonth, 8), '買菜');
      await tx(bank, CAT.飲食, 1000, '收入', dayOf(currentMonth, 9), '退貨退款');
      // 跨邊界轉出（選了「交通」支出分類）→ 歸入交通信封
      await xfer(bank, trk, 1500, CAT.交通, '轉到證券（記為交通）');
      // 信用卡刷卡：娛樂 2,000（visa）
      await tx(visa, CAT.娛樂, 2000, '支出', dayOf(currentMonth, 10), '電影＋遊戲（刷卡）');
      // 還款：銀行 → 信用卡 800
      await xfer(bank, visa, 800, CAT.娛樂, '繳卡費');
    });

    // ───────────────────────────────────────────────────────────────────
    await test.step('啟用預算（起始月＝本月）', async () => {
      await page.goto('/budget');
      await expect(page.getByText('開始掌控你的每一分錢')).toBeVisible({ timeout: 15_000 });
      await page.getByRole('button', { name: '啟用預算' }).click();
      await narrate(page, '啟用預算，起始月設為「本月」', 2000);
      const dialog = page.getByRole('dialog');
      await dialog.locator('input[type="month"]').fill(currentMonth.slice(0, 7));
      await dialog.getByRole('button', { name: '啟用預算' }).click();
      await expect(page.getByTestId('rta-amount')).toBeVisible({ timeout: 15_000 });
      await expect(page.getByTestId('month-label')).toHaveText(monthLabel(currentMonth));
    });

    // ───────────────────────────────────────────────────────────────────
    await test.step('① 未來月份預先分配（P2-D9）', async () => {
      await narrate(
        page,
        '① 未來月份預先分配\nPhase 1 只能停在本月；現在「下一月」按鈕可往未來走',
        2800,
      );
      await expect(page.getByTestId('month-next')).toBeEnabled();
      await page.getByTestId('month-next').click();
      // 未來月的 month-label 內含「未來」徽章文字，故用 toContainText
      await expect(page.getByTestId('month-label')).toContainText(monthLabel(futureMonth));
      await narrate(page, '切到下個月：月份旁出現「未來」徽章', 2200);
      await expect(page.getByTestId('future-badge')).toBeVisible();

      const rtaFuture = await page.getByTestId('rta-amount').textContent();
      await narrate(
        page,
        `未來月 RTA = ${rtaFuture?.trim()}\n在未來月先分配 $8,000 給「飲食」（預先規劃下月開銷）`,
        2800,
      );
      const shiyi = page.locator('[data-testid=budget-row][data-category-name="飲食"]');
      const cell = shiyi.getByTestId('assigned-cell');
      await cell.getByRole('button').click();
      const input = cell.getByRole('spinbutton');
      await input.fill('8000');
      await input.press('Enter');
      await narrate(
        page,
        '預先分配即時反映於未來月的 RTA（扣掉 $8,000）\n回到本月，本月的數字不受未來分配影響',
        3000,
      );
      await expect(cell.getByRole('button')).toHaveText('$8,000');
      await page.getByTestId('month-prev').click();
      await expect(page.getByTestId('month-label')).toHaveText(monthLabel(currentMonth));
      await expect(page.getByTestId('future-badge')).toHaveCount(0);
    });

    // ───────────────────────────────────────────────────────────────────
    await test.step('② 退款回補信封（P2-D7）', async () => {
      const shiyi = page.locator('[data-testid=budget-row][data-category-name="飲食"]');
      await narrate(
        page,
        '② 退款回補信封\n「飲食」買菜花 $3,000、退貨退回 $1,000\n退款掛在「飲食」分類 → 回補該信封，不灌進 RTA',
        3600,
      );
      // 收支淨額 = −3000 + 1000 = −2000（退款以正值沖回）
      await expect(shiyi.getByTestId('activity-cell')).toHaveText('-$2,000');
    });

    // ───────────────────────────────────────────────────────────────────
    await test.step('③ 跨邊界轉帳選填分類（P2-D8）', async () => {
      const jiaotong = page.locator('[data-testid=budget-row][data-category-name="交通"]');
      await narrate(
        page,
        '③ 跨邊界轉帳選填分類\n轉到證券戶的 $1,500 選了「交通」分類\n→ 直接歸入「交通」信封，不再落「轉出（未分類）」',
        3600,
      );
      await expect(jiaotong.getByTestId('activity-cell')).toHaveText('-$1,500');
      await expect(page.getByTestId('unclassified-row')).toHaveCount(0);
    });

    // ───────────────────────────────────────────────────────────────────
    await test.step('④ Targets + Underfunded + Auto-Assign（P2-D10）', async () => {
      const shiyi = page.locator('[data-testid=budget-row][data-category-name="飲食"]');
      await narrate(page, '④ 目標與自動分配\n為「飲食」設定目標：本月補滿到 $6,000', 2800);
      await shiyi.getByTestId('target-trigger').click();
      const pop = page.locator('[data-radix-popper-content-wrapper]');
      await expect(pop.getByRole('button', { name: '儲存目標' })).toBeVisible();
      await pop.getByPlaceholder('0').fill('6000');
      await pop.getByRole('button', { name: '儲存目標' }).click();

      await narrate(
        page,
        '信封下出現目標摘要與「差 $X」缺口（amber）\n缺口 = 目標 − 結轉 − 已分配',
        3000,
      );
      await expect(shiyi.getByTestId('underfunded-fill')).toBeVisible();

      await narrate(page, '點上方「補足不足額」一鍵自動補滿所有有目標的信封', 2600);
      await page.getByRole('button', { name: '補足不足額' }).click();
      await narrate(
        page,
        '「飲食」被自動分配到達標：可用補上、缺口消失（顯示「已達標」）',
        3000,
      );
      await expect(shiyi.getByText('已達標')).toBeVisible({ timeout: 10_000 });
    });

    // ───────────────────────────────────────────────────────────────────
    await test.step('⑤ 信用卡完整機制（P2-D1～D6）', async () => {
      const yule = page.locator('[data-testid=budget-row][data-category-name="娛樂"]');
      await narrate(
        page,
        '⑤ 信用卡完整機制\n「娛樂」刷卡 $2,000 但還沒分配 → 可用 -$2,000\n這是「信用超支」（刷卡超出信封），會累積成卡債、不扣 RTA',
        4000,
      );
      await expect(yule.getByTestId('activity-cell')).toHaveText('-$2,000');
      await expect(yule.getByTestId('available-cell')).toHaveText('-$2,000');
      await expect(page.getByTestId('overspending-banner')).toContainText('卡債');

      await narrate(
        page,
        '下方「信用卡付款」信封：國泰 Visa\n刷卡尚未被信封覆蓋 → 已撥備可付仍少（含已繳的 $800）',
        3400,
      );
      const ccRow = page.locator('[data-testid=cc-payment-row][data-card-name="國泰 Visa"]');
      await expect(ccRow).toBeVisible();

      await narrate(
        page,
        '把 $2,000 分配給「娛樂」信封 → 刷卡被「覆蓋」\n覆蓋的金額自動移入「信用卡付款」信封（撥備好錢去繳卡）',
        4000,
      );
      const cell = yule.getByTestId('assigned-cell');
      await cell.getByRole('button').click();
      const input = cell.getByRole('spinbutton');
      await input.fill('2000');
      await input.press('Enter');
      await narrate(
        page,
        '娛樂可用回到 $0（不再超支）；\n「信用卡付款」可付上升（covered $2,000 − 已繳 $800 = $1,200）',
        4000,
      );
      await expect(yule.getByTestId('available-cell')).toHaveText('$0', { timeout: 10_000 });
      await expect(ccRow.getByTestId('available-cell')).toHaveText('$1,200');

      await narrate(
        page,
        '也可直接「撥備」金額到信用卡付款信封：把可付欄改成 $5,000',
        2800,
      );
      const ccCell = ccRow.getByTestId('cc-assigned-cell');
      await ccCell.getByRole('button').click();
      const ccInput = ccCell.getByRole('spinbutton');
      await ccInput.fill('5000');
      await ccInput.press('Enter');
      await narrate(
        page,
        '撥備 $5,000 後，可付 = 撥備 5,000 + covered 2,000 − 已繳 800 = $6,200',
        3400,
      );
      await expect(ccRow.getByTestId('available-cell')).toHaveText('$6,200', { timeout: 10_000 });

      await narrate(
        page,
        '✅ Phase 2 示範完成：未來月份預先分配、退款回補、轉帳分類、\n目標/自動分配、信用卡覆蓋/撥備/還款皆正確運作',
        3600,
      );
    });
  });
});
