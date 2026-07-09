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
 * 教學影片 #11 — 預算基礎（YNAB 信封預算，Phase 1，§7）。改造自 e2e/budget-demo.spec.ts。
 * 範圍＝啟用 + RTA + 基本分配：啟用→RTA 來自真實帳戶→現金超支→跨月結轉→行內分配→分類間轉移。
 * （進階轉帳邊界/撥款/退款/信用卡等 Phase 2 機制見 budget-advanced 段。）
 */

const SLUG = 'budget-init';

// DB 既有的全域分類（userId=null）
const CAT = {
  飲食: '115f381d-e49c-4198-a037-af6f457a5fe2',
  交通: '1d0cbd7c-6ad8-4772-9277-9d7d7d86ed2a',
  娛樂: '7bea2120-6040-47a6-9058-96a074b96cc1',
  薪水: '10ac0ca0-e05d-4b19-a859-c50e0a374074',
} as const;

function prevMonthOf(m1st: string): string {
  let [y, m] = m1st.split('-').map(Number) as [number, number];
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

test.describe.configure({ mode: 'serial' });
test.setTimeout(220_000);

test.afterEach(async ({ page }) => {
  await saveVideo(page, SLUG);
});

test('啟用→RTA→現金超支→跨月結轉→行內分配→分類間轉移', async ({ page }) => {
  await installDemoOverlay(page);
  let currentMonth = '';
  let prevMonth = '';

  // ── 登入 + 種子 ──
  await page.goto('/login');
  await chapter(page, '預算 · 啟用', 1, 5);
  await narrate(
    page,
    '🎬 預算操作示範：把錢分配到各支出分類（像分裝進信封）\n先建立一個全新的訪客帳號作為乾淨的測試環境',
    2600,
  );
  await guestLogin(page);
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 60_000 });

  await narrate(
    page,
    '準備情境資料：\n• 永豐銀行（預算帳戶，起始 $100,000）\n• 上月餐費（沒分配 → 現金超支）\n• 本月薪水 $50,000 與交通支出',
    3200,
  );
  const status = await (await page.request.get(`${API}/budget`)).json();
  currentMonth = status.data.currentMonth as string;
  prevMonth = prevMonthOf(currentMonth);

  const mkAcc = async (name: string, type: string, balance: number, onBudget: boolean, color: string) =>
    (
      await (
        await page.request.post(`${API}/account`, {
          data: { name, type, balance, currencyCode: 'TWD', icon: 'wallet', color, isArchived: false, onBudget },
        })
      ).json()
    ).data.id as string;

  const bank = await mkAcc('永豐銀行', '銀行', 100000, true, '#10b981');

  const tx = (accountId: string, categoryId: string, amount: number, type: '收入' | '支出', date: string, description: string) =>
    page.request.post(`${API}/transaction`, {
      data: { accountId, categoryId, amount, description, date, time: '12:00', receipt: null, paymentFrequency: '單次', type },
    });

  await tx(bank, CAT.飲食, 5000, '支出', dayOf(prevMonth, 20), '上月餐費');
  await tx(bank, CAT.薪水, 50000, '收入', dayOf(currentMonth, 5), '本月薪水');
  await tx(bank, CAT.交通, 2000, '支出', dayOf(currentMonth, 10), '捷運通勤');

  // ── 啟用預算 ──
  await page.goto('/budget');
  await narrate(page, '進入「預算」頁，目前尚未啟用，顯示引導畫面', 2000);
  await expect(page.getByText('開始掌控你的每一分錢')).toBeVisible({ timeout: 15_000 });

  await click(page, page.getByRole('button', { name: '啟用預算' }));
  await narrate(page, '把起始月設為「上月」，並確認哪些帳戶要參與預算', 2400);
  const dialog = page.getByRole('dialog');
  await dialog.locator('input[type="month"]').fill(prevMonth.slice(0, 7));
  await expect(dialog.getByText('永豐銀行')).toBeVisible();
  await click(page, dialog.getByRole('button', { name: '啟用預算' }));
  await expect(page.getByTestId('rta-amount')).toBeVisible({ timeout: 15_000 });

  // ── 上月：RTA + 現金超支 ──
  await chapter(page, '預算 · RTA 與超支', 2, 5);
  await expect(page.getByTestId('month-label')).toHaveText(monthLabel(prevMonth));
  await narrate(
    page,
    '「可分配金額（RTA）」= $100,000\n這不是憑空輸入，而是預算帳戶的真實起始餘額',
    2800,
  );
  await expect(page.getByTestId('rta-amount')).toHaveText('$100,000');

  const shiyi = page.locator('[data-testid=budget-row][data-category-name="飲食"]');
  await narrate(page, '上月「飲食」花了 $5,000 卻沒分配預算\n→ 可用顯示 -$5,000（現金超支，紅色）', 2800);
  await expect(shiyi.getByTestId('activity-cell')).toHaveText('-$5,000');
  await expect(shiyi.getByTestId('available-cell')).toHaveText('-$5,000');

  await narrate(page, '出現超支提示：月底負值會歸零，差額會從「下個月」的 RTA 扣除', 2800);
  await expect(page.getByTestId('overspending-banner')).toBeVisible();

  await narrate(page, '目前停在起始月，無法再往前一個月（上一頁鈕已停用）', 2200);
  await expect(page.getByTestId('month-prev')).toBeDisabled();

  // ── 切到本月：跨月結轉與 RTA 明細 ──
  await chapter(page, '預算 · 跨月結轉', 3, 5);
  await narrate(page, '點「下一月」切換到本月', 1500);
  await click(page, page.getByTestId('month-next'));
  await expect(page.getByTestId('month-label')).toHaveText(monthLabel(currentMonth));

  await narrate(
    page,
    '本月 RTA = $145,000\n= 起始 $100,000 ＋ 本月薪水 $50,000 − 已分配 $0 − 前月超支 $5,000',
    3400,
  );
  await expect(page.getByTestId('rta-amount')).toHaveText('$145,000', { timeout: 10_000 });

  await narrate(page, '點 ⓘ 看 RTA 的組成明細', 1500);
  await click(page, page.getByTestId('rta-info'));
  await expect(page.getByText('RTA 組成')).toBeVisible();
  await narrate(
    page,
    '明細清楚列出：起始餘額、累計收入、累計已分配、\n以及「前月超支扣除 -$5,000」（上月的現金超支在這裡扣回）',
    3600,
  );
  const breakdown = page.locator('[data-radix-popper-content-wrapper]');
  await expect(breakdown.getByText('前月超支扣除')).toBeVisible();
  await expect(breakdown.getByText('-$5,000')).toBeVisible();
  await page.keyboard.press('Escape');

  // ── 行內分配 ──
  await chapter(page, '預算 · 分配', 4, 5);
  const jiaotong = page.locator('[data-testid=budget-row][data-category-name="交通"]');
  await narrate(page, '本月「交通」花了 $2,000，但還沒分配 → 可用 -$2,000', 2600);
  await expect(jiaotong.getByTestId('activity-cell')).toHaveText('-$2,000');
  await expect(jiaotong.getByTestId('available-cell')).toHaveText('-$2,000');

  await narrate(page, '直接在欄位上輸入 $5,000 分配給交通，按 Enter 送出', 2400);
  const cell = jiaotong.getByTestId('assigned-cell');
  await click(page, cell.getByRole('button'));
  const input = cell.getByRole('spinbutton');
  await type(page, input, '5000');
  await input.press('Enter');

  await narrate(
    page,
    '畫面即時更新（optimistic）：\n交通可用 = $5,000 − 已花 $2,000 = $3,000，RTA 同步降為 $140,000',
    3200,
  );
  await expect(cell.getByRole('button')).toHaveText('$5,000');
  await expect(jiaotong.getByTestId('available-cell')).toHaveText('$3,000');
  await expect(page.getByTestId('rta-amount')).toHaveText('$140,000');

  // ── 分類間轉移預算 ──
  await chapter(page, '預算 · 轉移', 5, 5);
  const yule = page.locator('[data-testid=budget-row][data-category-name="娛樂"]');
  await narrate(page, '點交通的「可用」金額，開啟轉移預算面板', 1800);
  await click(page, jiaotong.getByTestId('available-cell'));
  await expect(page.getByText('轉移預算', { exact: true })).toBeVisible();

  await narrate(page, '從交通搬 $1,000 到娛樂', 1800);
  await click(page, page.getByRole('combobox').nth(1));
  await click(page, page.getByRole('option', { name: '娛樂' }));
  await type(page, page.getByPlaceholder('0'), '1000');
  await click(page, page.getByRole('button', { name: '確認轉移' }));

  await narrate(
    page,
    '轉移預算只在分類之間移動：交通 $2,000、娛樂 $1,000\nRTA 不受影響（仍 $140,000）',
    3000,
  );
  await expect(jiaotong.getByTestId('available-cell')).toHaveText('$2,000', { timeout: 10_000 });
  await expect(yule.getByTestId('available-cell')).toHaveText('$1,000');
  await expect(page.getByTestId('rta-amount')).toHaveText('$140,000');

  await narrate(
    page,
    '✅ 預算基礎示範完成：啟用 → RTA 由真實帳戶推導 → 現金超支與跨月結轉\n→ 行內分配 → 分類間轉移預算',
    3600,
  );
});
