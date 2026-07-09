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
 * 教學影片 #12 — 預算進階（Phase 2 新功能，§7）。改造自 e2e/budget-phase2-demo.spec.ts。
 * 涵蓋：① 未來月份預先分配 ② 退款回補信封 ③ 轉帳選填分類 ④ 目標/自動分配 ⑤ 信用卡完整機制。
 */

const SLUG = 'budget-advanced';

const CAT = {
  飲食: '115f381d-e49c-4198-a037-af6f457a5fe2',
  交通: '1d0cbd7c-6ad8-4772-9277-9d7d7d86ed2a',
  娛樂: '7bea2120-6040-47a6-9058-96a074b96cc1',
  薪水: '10ac0ca0-e05d-4b19-a859-c50e0a374074',
} as const;

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

test.describe.configure({ mode: 'serial' });
test.setTimeout(220_000);

test.afterEach(async ({ page }) => {
  await saveVideo(page, SLUG);
});

test('未來月份 → 退款回補 → 轉帳分類 → 目標/自動分配 → 信用卡機制', async ({ page }) => {
  await installDemoOverlay(page);
  let currentMonth = '';
  let futureMonth = '';

  // ── 登入 + 種子 ──
  await page.goto('/login');
  await chapter(page, '預算進階 · 啟用', 1, 6);
  await narrate(
    page,
    '🎬 預算 Phase 2 新功能\n未來月份預先分配 / 退款回補 / 轉帳分類 / 目標與自動分配 / 信用卡機制',
    2800,
  );
  await guestLogin(page);
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 60_000 });

  const status = await (await page.request.get(`${API}/budget`)).json();
  currentMonth = status.data.currentMonth as string;
  futureMonth = nextMonthOf(currentMonth);

  const mkAcc = async (name: string, type: string, balance: number, onBudget: boolean, color: string, creditCardDetail?: object) =>
    (
      await (
        await page.request.post(`${API}/account`, {
          data: { name, type, balance, currencyCode: 'TWD', icon: 'wallet', color, isArchived: false, onBudget, ...(creditCardDetail ? { creditCardDetail } : {}) },
        })
      ).json()
    ).data.id as string;

  const bank = await mkAcc('永豐銀行', '銀行', 100000, true, '#10b981');
  const trk = await mkAcc('永豐證券', '證券戶', 5000, false, '#6366f1');
  const visa = await mkAcc('國泰 Visa', '信用卡', 0, true, '#6366f1', { statementDate: 5, paymentDueDate: 20, creditLimit: 80000 });

  const tx = (accountId: string, categoryId: string, amount: number, type: '收入' | '支出', date: string, description: string) =>
    page.request.post(`${API}/transaction`, {
      data: { accountId, categoryId, amount, description, date, time: '12:00', receipt: null, paymentFrequency: '單次', type },
    });
  const xfer = (from: string, to: string, amount: number, categoryId: string, description: string) =>
    page.request.post(`${API}/transaction/transfer`, {
      data: { accountId: from, targetAccountId: to, categoryId, amount, description, date: dayOf(currentMonth, 12), time: '10:00', receipt: null, paymentFrequency: '單次', type: '操作' },
    });

  await tx(bank, CAT.薪水, 50000, '收入', dayOf(currentMonth, 5), '本月薪水');
  await tx(bank, CAT.飲食, 3000, '支出', dayOf(currentMonth, 8), '買菜');
  await tx(bank, CAT.飲食, 1000, '收入', dayOf(currentMonth, 9), '退貨退款');
  await xfer(bank, trk, 1500, CAT.交通, '轉到證券（記為交通）');
  await tx(visa, CAT.娛樂, 2000, '支出', dayOf(currentMonth, 10), '電影＋遊戲（刷卡）');
  await xfer(bank, visa, 800, CAT.娛樂, '繳卡費');

  // ── 啟用預算（起始月＝本月）──
  await page.goto('/budget');
  await expect(page.getByText('開始掌控你的每一分錢')).toBeVisible({ timeout: 15_000 });
  await click(page, page.getByRole('button', { name: '啟用預算' }));
  await narrate(page, '啟用預算，起始月設為「本月」', 2000);
  const dialog = page.getByRole('dialog');
  await dialog.locator('input[type="month"]').fill(currentMonth.slice(0, 7));
  await click(page, dialog.getByRole('button', { name: '啟用預算' }));
  await expect(page.getByTestId('rta-amount')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('month-label')).toHaveText(monthLabel(currentMonth));

  // ── ① 未來月份預先分配 ──
  await chapter(page, '預算進階 · 未來月份', 2, 6);
  await narrate(page, '① 未來月份預先分配\nPhase 1 只能停在本月；現在「下一月」按鈕可往未來走', 2800);
  await expect(page.getByTestId('month-next')).toBeEnabled();
  await click(page, page.getByTestId('month-next'));
  await expect(page.getByTestId('month-label')).toContainText(monthLabel(futureMonth));
  await narrate(page, '切到下個月：月份旁出現「未來」徽章', 2200);
  await expect(page.getByTestId('future-badge')).toBeVisible();

  const rtaFuture = await page.getByTestId('rta-amount').textContent();
  await narrate(page, `未來月 RTA = ${rtaFuture?.trim()}\n在未來月先分配 $8,000 給「飲食」（預先規劃下月開銷）`, 2800);
  const shiyiF = page.locator('[data-testid=budget-row][data-category-name="飲食"]');
  const cellF = shiyiF.getByTestId('assigned-cell');
  await click(page, cellF.getByRole('button'));
  const inputF = cellF.getByRole('spinbutton');
  await type(page, inputF, '8000');
  await inputF.press('Enter');
  await narrate(page, '預先分配即時反映於未來月的 RTA（扣掉 $8,000）\n回到本月，本月的數字不受未來分配影響', 3000);
  await expect(cellF.getByRole('button')).toHaveText('$8,000');
  await click(page, page.getByTestId('month-prev'));
  await expect(page.getByTestId('month-label')).toHaveText(monthLabel(currentMonth));
  await expect(page.getByTestId('future-badge')).toHaveCount(0);

  // ── ② 退款回補信封 ──
  await chapter(page, '預算進階 · 退款回補', 3, 6);
  const shiyi = page.locator('[data-testid=budget-row][data-category-name="飲食"]');
  await narrate(page, '② 退款回補信封\n「飲食」買菜花 $3,000、退貨退回 $1,000\n退款掛在「飲食」分類 → 回補該信封，不灌進 RTA', 3600);
  await expect(shiyi.getByTestId('activity-cell')).toHaveText('-$2,000');

  // ── ③ 跨邊界轉帳選填分類 ──
  await chapter(page, '預算進階 · 轉帳分類', 4, 6);
  const jiaotong = page.locator('[data-testid=budget-row][data-category-name="交通"]');
  await narrate(page, '③ 跨邊界轉帳選填分類\n轉到證券戶的 $1,500 選了「交通」分類\n→ 直接歸入「交通」信封，不再落「轉出（未分類）」', 3600);
  await expect(jiaotong.getByTestId('activity-cell')).toHaveText('-$1,500');
  await expect(page.getByTestId('unclassified-row')).toHaveCount(0);

  // ── ④ Targets + Underfunded + Auto-Assign ──
  await chapter(page, '預算進階 · 目標/自動分配', 5, 6);
  await narrate(page, '④ 目標與自動分配\n為「飲食」設定目標：本月補滿到 $6,000', 2800);
  await click(page, shiyi.getByTestId('target-trigger'));
  const pop = page.locator('[data-radix-popper-content-wrapper]');
  await expect(pop.getByRole('button', { name: '儲存目標' })).toBeVisible();
  await type(page, pop.getByPlaceholder('0'), '6000');
  await click(page, pop.getByRole('button', { name: '儲存目標' }));

  await narrate(page, '信封下出現目標摘要與「差 $X」缺口（amber）\n缺口 = 目標 − 結轉 − 已分配', 3000);
  await expect(shiyi.getByTestId('underfunded-fill')).toBeVisible();

  await narrate(page, '點上方「補足不足額」一鍵自動補滿所有有目標的信封', 2600);
  await click(page, page.getByRole('button', { name: '補足不足額' }));
  await narrate(page, '「飲食」被自動分配到達標：可用補上、缺口消失（顯示「已達標」）', 3000);
  await expect(shiyi.getByText('已達標')).toBeVisible({ timeout: 10_000 });

  // ── ⑤ 信用卡完整機制 ──
  await chapter(page, '預算進階 · 信用卡', 6, 6);
  const yule = page.locator('[data-testid=budget-row][data-category-name="娛樂"]');
  await narrate(page, '⑤ 信用卡完整機制\n「娛樂」刷卡 $2,000 但還沒分配 → 可用 -$2,000\n這是「信用超支」（刷卡超出信封），會累積成卡債、不扣 RTA', 4000);
  await expect(yule.getByTestId('activity-cell')).toHaveText('-$2,000');
  await expect(yule.getByTestId('available-cell')).toHaveText('-$2,000');
  await expect(page.getByTestId('overspending-banner')).toContainText('卡債');

  await narrate(page, '下方「信用卡付款」信封：國泰 Visa\n刷卡尚未被信封覆蓋 → 已撥備可付仍少（含已繳的 $800）', 3400);
  const ccRow = page.locator('[data-testid=cc-payment-row][data-card-name="國泰 Visa"]');
  await expect(ccRow).toBeVisible();

  await narrate(page, '把 $2,000 分配給「娛樂」信封 → 刷卡被「覆蓋」\n覆蓋的金額自動移入「信用卡付款」信封（撥備好錢去繳卡）', 4000);
  const cell = yule.getByTestId('assigned-cell');
  await click(page, cell.getByRole('button'));
  const input = cell.getByRole('spinbutton');
  await type(page, input, '2000');
  await input.press('Enter');
  await narrate(page, '娛樂可用回到 $0（不再超支）；\n「信用卡付款」可付上升（covered $2,000 − 已繳 $800 = $1,200）', 4000);
  await expect(yule.getByTestId('available-cell')).toHaveText('$0', { timeout: 10_000 });
  await expect(ccRow.getByTestId('available-cell')).toHaveText('$1,200');

  await narrate(page, '也可直接「撥備」金額到信用卡付款信封：把可付欄改成 $5,000', 2800);
  const ccCell = ccRow.getByTestId('cc-assigned-cell');
  await click(page, ccCell.getByRole('button'));
  const ccInput = ccCell.getByRole('spinbutton');
  await type(page, ccInput, '5000');
  await ccInput.press('Enter');
  await narrate(page, '撥備 $5,000 後，可付 = 撥備 5,000 + covered 2,000 − 已繳 800 = $6,200', 3400);
  await expect(ccRow.getByTestId('available-cell')).toHaveText('$6,200', { timeout: 10_000 });

  await narrate(page, '✅ Phase 2 示範完成：未來月份預先分配、退款回補、轉帳分類、\n目標/自動分配、信用卡覆蓋/撥備/還款皆正確運作', 3600);
});
