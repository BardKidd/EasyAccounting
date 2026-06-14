/**
 * YNAB 預算「真實 DB」整合測試（Phase 1 MVP，spec §9）。
 *
 * 涵蓋：
 *   - startRTA 動態推導（起始月前交易構成起始部位、起始月後交易回推）
 *   - 轉帳邊界（on-budget 內部零影響；→tracking 轉出進虛擬列；tracking→ 轉入進 RTA）
 *   - Sub 分類 roll-up 到 Main、跨月結轉與 cash overspending 扣下月 RTA
 *   - assign / moveMoney / 範圍與分類驗證
 *   - 本位幣切換：assigned 按該月 1 號歷史匯率換算、缺匯率整批中止
 *   - 分類刪除 → assignment 硬刪、RTA 回升
 *
 * 依賴 migration 20260611000000-create-budget-phase1 已套用。
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

process.env.RESEND_API_KEY = 're_123';

import {
  PaymentFrequency,
  RootType,
  ExchangeRateSource,
} from '@repo/shared';
import {
  User,
  Account,
  Transaction,
  Category,
  ExchangeRate,
  BudgetAssignment,
  BudgetTarget,
} from '@/models';
import transactionServices from '@/services/transactionServices';
import budgetService from '@/services/budgetService';
import { changeBaseCurrency } from '@/services/baseCurrencyService';
import { clearRateCache } from '@/services/exchangeRateService';

// 測試情境鎖定 2026-05（startMonth）與 2026-06（當月）。
// 用假時鐘把「當月」固定在 2026-06，使 suite 與真實系統時間解耦——
// 不再因 7 月後系統時間改變而靜默 skip（budget-ynab review M7）。
// 只 fake Date（保留真實 setTimeout/setInterval，避免影響 DB I/O 連線逾時）。
const FAKE_NOW = new Date('2026-06-15T00:00:00Z');

const RD = '2000-01-03'; // 基準匯率生效日（早於所有交易/月份，rateDate <= date 語意全覆蓋）
const SWITCH_DAY_RD = '2026-06-15'; // 「切換當日」誘餌匯率生效日——驗證 assigned 用「該月 1 號」而非切換當日匯率（L2）

describe('YNAB 預算 真實 DB 整合（Phase 1）', () => {
  let userId: string;
  let bank: any; // on-budget 銀行
  let bank2: any; // on-budget 銀行（內部轉帳對手）
  let track: any; // tracking 證券戶
  let mainA: any; // 全域支出 Main
  let mainB: any; // 全域支出 Main
  let subA: any; // mainA 底下的 Sub
  let userMainC: any; // 使用者自建 Main（刪除測試用）

  const baseTx = {
    description: 'budget-flow-test',
    time: '12:00:00',
    receipt: '',
    paymentFrequency: PaymentFrequency.ONE_TIME,
  };

  const expense = (accountId: string, categoryId: string, amount: number, date: string) =>
    transactionServices.createTransaction(
      { ...baseTx, type: RootType.EXPENSE, accountId, categoryId, amount, date } as any,
      userId,
    );
  const income = (accountId: string, categoryId: string, amount: number, date: string) =>
    transactionServices.createTransaction(
      { ...baseTx, type: RootType.INCOME, accountId, categoryId, amount, date } as any,
      userId,
    );
  const transfer = (accountId: string, targetAccountId: string, amount: number, date: string, categoryId: string) =>
    transactionServices.createTransfer(
      { ...baseTx, type: RootType.OPERATE, accountId, targetAccountId, categoryId, amount, date } as any,
      userId,
    );

  beforeAll(async () => {
    clearRateCache();
    // email 唯一性需在啟用假時鐘前取得真實時間戳（假時鐘下 Date.now() 固定會撞 unique）
    const uniqueEmail = `budgetflow-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(FAKE_NOW);
    const user = await User.create({
      name: 'BudgetFlow Test',
      email: uniqueEmail,
      password: 'hashed_pw_for_test',
      isGuest: false,
      baseCurrencyCode: 'TWD',
    } as any);
    userId = (user as any).id;

    bank = await Account.create({
      userId, name: 'BF-Bank', type: '銀行', balance: 0,
      currencyCode: 'TWD', icon: 'bank', color: '#000', onBudget: true,
    } as any);
    bank2 = await Account.create({
      userId, name: 'BF-Bank2', type: '銀行', balance: 0,
      currencyCode: 'TWD', icon: 'bank', color: '#000', onBudget: true,
    } as any);
    track = await Account.create({
      userId, name: 'BF-Track', type: '證券戶', balance: 0,
      currencyCode: 'TWD', icon: 'chart', color: '#000', onBudget: false,
    } as any);

    // 全域支出 Main 兩個 + mainA 的 Sub 一個
    const expenseRoot = await Category.findOne({
      where: { type: RootType.EXPENSE, parentId: null },
    });
    expect(expenseRoot).not.toBeNull();
    const mains = await Category.findAll({
      where: { parentId: (expenseRoot as any).id, userId: null },
      order: [['createdAt', 'ASC']],
    });
    expect(mains.length).toBeGreaterThanOrEqual(2);
    mainA = mains[0];
    mainB = mains[1];
    subA = await Category.findOne({ where: { parentId: mainA.id } });
    expect(subA).not.toBeNull();

    // 真實收入須掛「收入 root」分類（否則 P2-D7 會把它判為退款回補信封而非 RTA inflow）
    const incomeRoot = await Category.findOne({
      where: { type: RootType.INCOME, parentId: null },
    });
    const incomeCat = await Category.findOne({
      where: { parentId: (incomeRoot as any).id, userId: null },
      order: [['createdAt', 'ASC']],
    });
    expect(incomeCat).not.toBeNull();

    // 使用者自建 Main（分類刪除測試用）
    userMainC = await Category.create({
      name: 'BF-自建分類',
      type: RootType.EXPENSE,
      parentId: (expenseRoot as any).id,
      userId,
      icon: 'category',
      color: '#123456',
    } as any);

    // ---- 交易場景 ----
    // 起始月（2026-05）之前：構成起始部位
    await income(bank.id, (incomeCat as any).id, 20000, '2026-04-15');
    // 5 月：收入 + Sub 層支出（roll-up 到 mainA）+ 跨邊界轉出
    await income(bank.id, (incomeCat as any).id, 5000, '2026-05-05');
    await expense(bank.id, (subA as any).id, 3000, '2026-05-10');
    await transfer(bank.id, track.id, 2000, '2026-05-20', mainA.id);
    // 6 月：Main 層支出 + tracking→on-budget 轉入 + on-budget 內部轉帳（應零影響）
    await expense(bank.id, mainB.id, 1500, '2026-06-03');
    await transfer(track.id, bank.id, 800, '2026-06-05', mainA.id);
    await transfer(bank.id, bank2.id, 1000, '2026-06-07', mainA.id);

    // ---- 啟用預算 + 分配 ----
    await budgetService.initBudget(userId, '2026-05-01');
    await budgetService.assign(userId, '2026-05-01', mainA.id, 2500);
    await budgetService.assign(userId, '2026-05-01', mainB.id, 1000);
    await budgetService.assign(userId, '2026-06-01', mainB.id, 200);
    // RTA → mainA 搬 300
    await budgetService.moveMoney(userId, '2026-06-01', null, mainA.id, 300);
  });

  afterAll(async () => {
    await BudgetAssignment.destroy({ where: { userId } });
    await Transaction.destroy({ where: { userId }, force: true });
    await Account.destroy({ where: { userId }, force: true });
    await Category.destroy({ where: { userId }, force: true });
    await ExchangeRate.destroy({ where: { rateDate: RD }, force: true });
    await ExchangeRate.destroy({ where: { rateDate: SWITCH_DAY_RD }, force: true });
    await User.destroy({ where: { id: userId }, force: true });
    clearRateCache();
    vi.useRealTimers();
  });

  it('狀態：啟用後回報 startMonth 與本位幣', async () => {
    const status = await budgetService.getStatus(userId);
    expect(status.enabled).toBe(true);
    expect(status.startMonth).toBe('2026-05-01');
    expect(status.baseCurrencyCode).toBe('TWD');
  });

  it('5 月視圖：startRTA 回推、Sub roll-up、跨邊界轉出分類歸信封（P2-D8）', async () => {
    const view = await budgetService.getMonthView(userId, '2026-05-01');

    // startRTA：bank 現值 18300 − Σ(起始後 −1700) = 20000；bank2 現值 1000 − 1000 = 0
    expect(view.rtaBreakdown.startingBalance).toBe(20000);
    expect(view.rtaBreakdown.cumulativeInflow).toBe(5000);
    expect(view.rtaBreakdown.cumulativeAssigned).toBe(3500);
    expect(view.rtaBreakdown.priorOverspending).toBe(0);
    // RTA = 20000 + 5000 − 3500 = 21500
    expect(view.readyToAssign).toBe(21500);

    // mainA：Sub 支出 roll-up −3000 + 跨邊界轉出（分類為 mainA → P2-D8 歸該信封）−2000 = −5000
    // 2500 − 5000 = −2500（超支）
    const rowA = view.rows.find((r) => r.categoryId === mainA.id)!;
    expect(rowA.assigned).toBe(2500);
    expect(rowA.activity).toBe(-5000);
    expect(rowA.available).toBe(-2500);
    expect(rowA.isOverspent).toBe(true);

    const rowB = view.rows.find((r) => r.categoryId === mainB.id)!;
    expect(rowB.available).toBe(1000);

    // 轉出已分類為支出 Main（P2-D8）→ 不再落虛擬未分類列
    expect(view.unclassifiedTransferOut).toBeNull();
  });

  it('6 月視圖：前月 cash overspending 扣 RTA、結轉、tracking 轉入進 RTA、內部轉帳零影響', async () => {
    const view = await budgetService.getMonthView(userId, '2026-06-01');

    // priorOverspending = mainA −2500（含已分類轉出 P2-D8）+ 虛擬列 0 = −2500
    expect(view.rtaBreakdown.priorOverspending).toBe(-2500);
    // cumInflow = 5000 + 800（tracking→on-budget 轉入）；內部轉帳 1000 不出現在任何數字
    expect(view.rtaBreakdown.cumulativeInflow).toBe(5800);
    expect(view.rtaBreakdown.cumulativeAssigned).toBe(4000);
    // RTA = 20000 + 5800 − 4000 − 2500 = 19300
    expect(view.readyToAssign).toBe(19300);

    // mainA：負結轉歸零 + moveMoney 300 → 300
    const rowA = view.rows.find((r) => r.categoryId === mainA.id)!;
    expect(rowA.assigned).toBe(300);
    expect(rowA.available).toBe(300);

    // mainB：carry 1000 + 200 − 1500 = −300
    const rowB = view.rows.find((r) => r.categoryId === mainB.id)!;
    expect(rowB.available).toBe(-300);
    expect(rowB.isOverspent).toBe(true);

    // 虛擬列 6 月無活動且 available 歸零後為 0 → null
    expect(view.unclassifiedTransferOut).toBeNull();

    // 守恆（非套套邏輯）：獨立加總所有信封 available（含虛擬列），與手算值比對。
    // 此和取自 rows 而非 rtaBreakdown 累計器，故 fold 的 available/結轉/歸零有 bug 會被抓到。
    // mainA 300 + mainB −300 + 其他 0 + 虛擬列 0 = 0
    const sumAvailable =
      view.rows.reduce((s, r) => s + r.available, 0) +
      (view.unclassifiedTransferOut?.available ?? 0);
    expect(sumAvailable).toBeCloseTo(0, 5);
  });

  it('驗證：範圍外月份與非 Main 分類被拒', async () => {
    // 起始月之前
    await expect(
      budgetService.getMonthView(userId, '2026-04-01'),
    ).rejects.toThrow(/有效範圍/);
    // 超過未來上界（當月 2026-06 + BUDGET_MAX_FUTURE_MONTHS=12 → 上界 2027-06）仍被拒
    await expect(
      budgetService.assign(userId, '2027-07-01', mainA.id, 100),
    ).rejects.toThrow(/有效範圍/);
    // Sub 層分類不可當信封
    await expect(
      budgetService.assign(userId, '2026-06-01', (subA as any).id, 100),
    ).rejects.toThrow(/Main/);
    // moveMoney 失敗路徑（L4）：Sub 分類為來源/目的地、範圍外月份
    await expect(
      budgetService.moveMoney(userId, '2026-06-01', (subA as any).id, mainA.id, 50),
    ).rejects.toThrow(/Main/);
    await expect(
      budgetService.moveMoney(userId, '2026-06-01', null, (subA as any).id, 50),
    ).rejects.toThrow(/Main/);
    await expect(
      budgetService.moveMoney(userId, '2027-07-01', null, mainA.id, 50),
    ).rejects.toThrow(/有效範圍/);
    // 啟用月之前的月份 assign 也被拒
    await expect(
      budgetService.assign(userId, '2026-04-01', mainA.id, 100),
    ).rejects.toThrow(/有效範圍/);
  });

  it('Phase 2 未來月份預先分配：可分配到 horizon 內未來月份且即時反映於該月 RTA', async () => {
    const future = '2026-07-01'; // 當月 2026-06 + 1，在 horizon 內
    const before = await budgetService.getMonthView(userId, future);
    const rtaBefore = before.readyToAssign;

    // 分配 500 到 mainB（未來月）→ 即時扣減該月 RTA
    await budgetService.assign(userId, future, mainB.id, 500);
    const after = await budgetService.getMonthView(userId, future);
    expect(after.readyToAssign).toBeCloseTo(rtaBefore - 500, 5);

    // mainB 6 月 available −300 → 結轉 max(0,−300)=0；7 月 = 0 + 500 = 500
    const rowB = after.rows.find((r) => r.categoryId === mainB.id)!;
    expect(rowB.assigned).toBe(500);
    expect(rowB.available).toBeCloseTo(500, 5);

    // 清掉未來月分配，避免污染後續本位幣切換測試（assigned=0 等同不存在）
    await budgetService.assign(userId, future, mainB.id, 0);
  });

  it('分類刪除：assignment 硬刪、RTA 回升（spec §3.2）', async () => {
    await budgetService.assign(userId, '2026-06-01', userMainC.id, 700);
    const before = await budgetService.getMonthView(userId, '2026-06-01');
    expect(before.readyToAssign).toBe(19300 - 700);

    // soft-delete 分類 → afterDestroy hook 硬刪 assignment
    await userMainC.destroy();
    const rows = await BudgetAssignment.findAll({
      where: { userId, categoryId: userMainC.id },
    });
    expect(rows.length).toBe(0);

    const after = await budgetService.getMonthView(userId, '2026-06-01');
    expect(after.readyToAssign).toBe(19300);
    expect(after.rows.find((r) => r.categoryId === userMainC.id)).toBeUndefined();
  });

  it('本位幣切換：assigned 按該月 1 號歷史匯率換算（非切換當日）；缺匯率整批中止', async () => {
    await ExchangeRate.create({ baseCode: 'TWD', quoteCode: 'USD', rate: 0.03125, rateDate: RD, source: ExchangeRateSource.MANUAL } as any);
    await ExchangeRate.create({ baseCode: 'USD', quoteCode: 'TWD', rate: 32, rateDate: RD, source: ExchangeRateSource.MANUAL } as any);
    // 誘餌：切換當日（2026-06-15，> 所有交易/assignment 月份）給「不同」匯率 0.05。
    // 若實作誤用「切換當日匯率」，assigned 會變 2500×0.05=125；正確的「該月 1 號匯率」為 78.125。
    // 生效日晚於最後一筆交易（2026-06-07）與兩個 assignment 月份，故不影響其他推導數字。
    await ExchangeRate.create({ baseCode: 'TWD', quoteCode: 'USD', rate: 0.05, rateDate: SWITCH_DAY_RD, source: ExchangeRateSource.MANUAL } as any);
    await ExchangeRate.create({ baseCode: 'USD', quoteCode: 'TWD', rate: 20, rateDate: SWITCH_DAY_RD, source: ExchangeRateSource.MANUAL } as any);

    const result = await changeBaseCurrency(userId, 'USD');
    expect(result.changed).toBe(true);

    // assigned 2500 × 0.03125(該月1號) = 78.125（而非 2500×0.05=125 的切換當日匯率）
    const rowA = await BudgetAssignment.findOne({
      where: { userId, categoryId: mainA.id, month: '2026-05-01' },
    });
    expect(Number((rowA as any).assigned)).toBeCloseTo(78.125, 5);

    // 推導值整體縮放：RTA 19300 × 0.03125 = 603.125
    const view = await budgetService.getMonthView(userId, '2026-06-01');
    expect(view.readyToAssign).toBeCloseTo(603.125, 3);
    expect(view.rtaBreakdown.startingBalance).toBeCloseTo(625, 3);

    // 缺匯率：切到 EUR 無任何匯率 → 整批中止、assigned 不變
    await expect(changeBaseCurrency(userId, 'EUR')).rejects.toThrow(/匯率/);
    const rowA2 = await BudgetAssignment.findOne({
      where: { userId, categoryId: mainA.id, month: '2026-05-01' },
    });
    expect(Number((rowA2 as any).assigned)).toBeCloseTo(78.125, 5);
  });
});

/**
 * 恆等式 5（spec §5.1.5）：編輯 / 刪除 / 翻轉帳戶 onBudget 後，全推導視圖與「從頭重放」一致。
 * 並覆蓋 review H2：soft-delete「仍有活動」的分類，信封保留標註「（已刪除）」、交易不被連帶刪除。
 * 自足 fixture，與上面的多月情境互不干擾。
 */
describe('YNAB 預算 回放一致性 + 分類刪除資料保全', () => {
  let userId: string;
  let bank: any;
  let userMain: any;
  let subUnderMain: any;
  let txId: string;

  const baseTx = {
    description: 'replay-test',
    time: '12:00:00',
    receipt: '',
    paymentFrequency: PaymentFrequency.ONE_TIME,
  };
  const expense = (accountId: string, categoryId: string, amount: number, date: string) =>
    transactionServices.createTransaction(
      { ...baseTx, type: RootType.EXPENSE, accountId, categoryId, amount, date } as any,
      userId,
    );

  beforeAll(async () => {
    clearRateCache();
    const uniqueEmail = `budgetreplay-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(FAKE_NOW);
    const user = await User.create({
      name: 'BudgetReplay Test',
      email: uniqueEmail,
      password: 'hashed_pw_for_test',
      isGuest: false,
      baseCurrencyCode: 'TWD',
    } as any);
    userId = (user as any).id;

    bank = await Account.create({
      userId, name: 'BR-Bank', type: '銀行', balance: 0,
      currencyCode: 'TWD', icon: 'bank', color: '#000', onBudget: true,
    } as any);

    const expenseRoot = await Category.findOne({
      where: { type: RootType.EXPENSE, parentId: null },
    });
    userMain = await Category.create({
      name: 'BR-自建Main', type: RootType.EXPENSE,
      parentId: (expenseRoot as any).id, userId, icon: 'c', color: '#111',
    } as any);
    subUnderMain = await Category.create({
      name: 'BR-Sub', type: RootType.EXPENSE,
      parentId: userMain.id, userId, icon: 'c', color: '#222',
    } as any);

    const tx = await expense(bank.id, userMain.id, 1000, '2026-05-10');
    txId = (tx as any).id ?? (tx as any).data?.id;

    await budgetService.initBudget(userId, '2026-05-01');
    await budgetService.assign(userId, '2026-05-01', userMain.id, 1500);
  });

  afterAll(async () => {
    await BudgetAssignment.destroy({ where: { userId } });
    await Transaction.destroy({ where: { userId }, force: true });
    await Account.destroy({ where: { userId }, force: true });
    await Category.destroy({ where: { userId }, force: true });
    await User.destroy({ where: { id: userId }, force: true });
    clearRateCache();
    vi.useRealTimers();
  });

  it('回放：編輯交易金額後視圖即時反映新值', async () => {
    const before = await budgetService.getMonthView(userId, '2026-05-01');
    const rowBefore = before.rows.find((r) => r.categoryId === userMain.id)!;
    expect(rowBefore.activity).toBe(-1000);
    expect(rowBefore.available).toBe(500); // 1500 − 1000

    await transactionServices.updateIncomeExpense(txId, { amount: 1400 } as any, userId);

    const after = await budgetService.getMonthView(userId, '2026-05-01');
    const rowAfter = after.rows.find((r) => r.categoryId === userMain.id)!;
    expect(rowAfter.activity).toBe(-1400);
    expect(rowAfter.available).toBe(100); // 1500 − 1400
  });

  it('回放：翻轉帳戶 onBudget 後該帳戶活動與起始部位即時重分類', async () => {
    // 當前金額 1400。翻成 off-budget → 該帳戶活動退出預算
    await bank.update({ onBudget: false });
    const off = await budgetService.getMonthView(userId, '2026-05-01');
    const rowOff = off.rows.find((r) => r.categoryId === userMain.id)!;
    expect(rowOff.activity).toBe(0);
    expect(rowOff.available).toBe(1500); // 無活動，全額可用
    // 起始部位也排除該帳戶（無其他 on-budget 帳戶 → 0）
    expect(off.rtaBreakdown.startingBalance).toBe(0);

    // 翻回 on-budget → 活動重新計入
    await bank.update({ onBudget: true });
    const on = await budgetService.getMonthView(userId, '2026-05-01');
    const rowOn = on.rows.find((r) => r.categoryId === userMain.id)!;
    expect(rowOn.activity).toBe(-1400);
  });

  it('回放：刪除交易後活動歸零', async () => {
    await transactionServices.deleteTransaction(txId, userId);
    const after = await budgetService.getMonthView(userId, '2026-05-01');
    const row = after.rows.find((r) => r.categoryId === userMain.id)!;
    expect(row.activity).toBe(0);
    expect(row.available).toBe(1500);
  });

  it('H2：刪除「仍有活動」的分類，信封保留標註（已刪除）、交易不被連帶刪除', async () => {
    // 在 Sub 層新增一筆支出（roll-up 到 userMain）
    const tx2 = await expense(bank.id, subUnderMain.id, 800, '2026-05-12');
    const tx2Id = (tx2 as any).id ?? (tx2 as any).data?.id;

    const before = await budgetService.getMonthView(userId, '2026-05-01');
    expect(before.rows.find((r) => r.categoryId === userMain.id)!.activity).toBe(-800);

    // soft-delete userMain → afterDestroy 串接 soft-delete 子分類 + 硬刪 assignment
    await userMain.destroy();

    // 交易「未」被連帶刪除（無資料遺失）
    const survived = await Transaction.findByPk(tx2Id);
    expect(survived).not.toBeNull();

    // assignment 被硬刪、RTA 回升
    const assigns = await BudgetAssignment.findAll({
      where: { userId, categoryId: userMain.id },
    });
    expect(assigns.length).toBe(0);

    // 信封仍保留為 orphan、標註（已刪除）、活動沖銷維持（−800 → 負 available 計超支）
    const after = await budgetService.getMonthView(userId, '2026-05-01');
    const ghost = after.rows.find((r) => r.categoryId === userMain.id);
    expect(ghost).toBeDefined();
    expect(ghost!.name).toMatch(/已刪除/);
    expect(ghost!.activity).toBe(-800);
    expect(ghost!.available).toBe(-800); // assigned 已歸零
    expect(ghost!.isOverspent).toBe(true);
  });
});

/**
 * Phase 2 ② — 退款回補信封（P2-D7）+ 跨邊界轉帳選填分類（P2-D8）。
 * 自足 fixture：bank(on-budget) / track(off-budget) + 真實收入 + 支出 + 退款（收入掛支出 Main）
 * + 未分類轉出（操作分類）。驗證退款不進 RTA、轉出依分類 root 歸信封或虛擬列、守恆成立。
 */
describe('YNAB 預算 Phase 2②：退款回補（P2-D7）+ 轉帳分類（P2-D8）', () => {
  let userId: string;
  let bank: any;
  let track: any;
  let mainX: any; // 支出 Main（退款目標）
  let salaryCat: any; // 收入 Main（真實收入）
  let transferCat: any; // 操作/轉帳 分類（未分類轉出）

  const baseTx = {
    description: 'p2b-test',
    time: '12:00:00',
    receipt: '',
    paymentFrequency: PaymentFrequency.ONE_TIME,
  };
  const expense = (a: string, c: string, amt: number, d: string) =>
    transactionServices.createTransaction(
      { ...baseTx, type: RootType.EXPENSE, accountId: a, categoryId: c, amount: amt, date: d } as any,
      userId,
    );
  const income = (a: string, c: string, amt: number, d: string) =>
    transactionServices.createTransaction(
      { ...baseTx, type: RootType.INCOME, accountId: a, categoryId: c, amount: amt, date: d } as any,
      userId,
    );
  const transfer = (a: string, t: string, amt: number, d: string, c: string) =>
    transactionServices.createTransfer(
      { ...baseTx, type: RootType.OPERATE, accountId: a, targetAccountId: t, categoryId: c, amount: amt, date: d } as any,
      userId,
    );

  beforeAll(async () => {
    clearRateCache();
    const uniqueEmail = `p2b-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(FAKE_NOW);
    const user = await User.create({
      name: 'P2B Test', email: uniqueEmail, password: 'hashed_pw_for_test',
      isGuest: false, baseCurrencyCode: 'TWD',
    } as any);
    userId = (user as any).id;
    bank = await Account.create({
      userId, name: 'P2B-Bank', type: '銀行', balance: 0,
      currencyCode: 'TWD', icon: 'bank', color: '#000', onBudget: true,
    } as any);
    track = await Account.create({
      userId, name: 'P2B-Track', type: '證券戶', balance: 0,
      currencyCode: 'TWD', icon: 'chart', color: '#000', onBudget: false,
    } as any);

    const expenseRoot = await Category.findOne({ where: { type: RootType.EXPENSE, parentId: null } });
    mainX = await Category.findOne({
      where: { parentId: (expenseRoot as any).id, userId: null },
      order: [['createdAt', 'ASC']],
    });
    const incomeRoot = await Category.findOne({ where: { type: RootType.INCOME, parentId: null } });
    salaryCat = await Category.findOne({
      where: { parentId: (incomeRoot as any).id, userId: null },
      order: [['createdAt', 'ASC']],
    });
    const operateRoot = await Category.findOne({ where: { type: RootType.OPERATE, parentId: null } });
    transferCat = await Category.findOne({
      where: { parentId: (operateRoot as any).id, userId: null },
      order: [['createdAt', 'ASC']],
    });
    expect(mainX).not.toBeNull();
    expect(salaryCat).not.toBeNull();
    expect(transferCat).not.toBeNull();

    // 交易（皆在 2026-05，startMonth 後）
    await income(bank.id, salaryCat.id, 5000, '2026-05-05'); // 真實收入 → RTA
    await expense(bank.id, mainX.id, 1000, '2026-05-10'); // 支出 −1000
    await income(bank.id, mainX.id, 300, '2026-05-12'); // 退款（收入掛支出 Main）→ +300 回補
    await transfer(bank.id, track.id, 400, '2026-05-15', transferCat.id); // 未分類轉出（操作分類）→ 虛擬列

    await budgetService.initBudget(userId, '2026-05-01');
    await budgetService.assign(userId, '2026-05-01', mainX.id, 1500);
  });

  afterAll(async () => {
    await BudgetAssignment.destroy({ where: { userId } });
    await Transaction.destroy({ where: { userId }, force: true });
    await Account.destroy({ where: { userId }, force: true });
    await User.destroy({ where: { id: userId }, force: true });
    clearRateCache();
    vi.useRealTimers();
  });

  it('退款回補信封：收入掛支出 Main → 正 activity 回補、不計入 RTA inflow（P2-D7）', async () => {
    const view = await budgetService.getMonthView(userId, '2026-05-01');
    const rowX = view.rows.find((r) => r.categoryId === mainX.id)!;
    // activity = −1000(支出) + 300(退款) = −700
    expect(rowX.activity).toBe(-700);
    // available = 1500 − 700 = 800
    expect(rowX.available).toBe(800);
    // 退款不進 inflow：只有真實收入 5000
    expect(view.rtaBreakdown.cumulativeInflow).toBe(5000);
    // startRTA 0；RTA = 0 + 5000 − 1500 = 3500（若退款誤計 inflow 會是 3800）
    expect(view.rtaBreakdown.startingBalance).toBe(0);
    expect(view.readyToAssign).toBe(3500);
  });

  it('未分類跨邊界轉出（操作分類）仍落虛擬列 UNCLASSIFIED_OUT（P2-D8 反例）', async () => {
    const view = await budgetService.getMonthView(userId, '2026-05-01');
    expect(view.unclassifiedTransferOut).toEqual({ activity: -400, available: -400 });
  });

  it('守恆（含退款 + 未分類轉出）：startRTA + 流入 + ΣActivity = RTA + Σ Available', async () => {
    const view = await budgetService.getMonthView(userId, '2026-05-01');
    const sumAvailable =
      view.rows.reduce((s, r) => s + r.available, 0) +
      (view.unclassifiedTransferOut?.available ?? 0);
    const sumActivity =
      view.rows.reduce((s, r) => s + r.activity, 0) +
      (view.unclassifiedTransferOut?.activity ?? 0);
    expect(
      view.rtaBreakdown.startingBalance +
        view.rtaBreakdown.cumulativeInflow +
        sumActivity,
    ).toBeCloseTo(view.readyToAssign + sumAvailable, 5);
  });
});

/**
 * Phase 2 ③ — Targets + Underfunded + Auto-Assign（P2-D10）。
 * 自足 fixture：bank(on-budget) + 一個支出 Main（mainT）。無交易（純驗證 target/underfunded/auto-assign）。
 */
describe('YNAB 預算 Phase 2③：Targets + Underfunded + Auto-Assign（P2-D10）', () => {
  let userId: string;
  let mainT: any;
  let subT: any;

  beforeAll(async () => {
    clearRateCache();
    const uniqueEmail = `p2c-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(FAKE_NOW);
    const user = await User.create({
      name: 'P2C Test', email: uniqueEmail, password: 'hashed_pw_for_test',
      isGuest: false, baseCurrencyCode: 'TWD',
    } as any);
    userId = (user as any).id;
    await Account.create({
      userId, name: 'P2C-Bank', type: '銀行', balance: 100000,
      currencyCode: 'TWD', icon: 'bank', color: '#000', onBudget: true,
    } as any);

    const expenseRoot = await Category.findOne({ where: { type: RootType.EXPENSE, parentId: null } });
    mainT = await Category.findOne({
      where: { parentId: (expenseRoot as any).id, userId: null },
      order: [['createdAt', 'ASC']],
    });
    subT = await Category.findOne({ where: { parentId: mainT.id } });
    expect(mainT).not.toBeNull();
    expect(subT).not.toBeNull();

    await budgetService.initBudget(userId, '2026-05-01');
  });

  afterAll(async () => {
    await BudgetTarget.destroy({ where: { userId } });
    await BudgetAssignment.destroy({ where: { userId } });
    await Account.destroy({ where: { userId }, force: true });
    await User.destroy({ where: { id: userId }, force: true });
    clearRateCache();
    vi.useRealTimers();
  });

  /** 設定 target + 指定 assigned，回傳該月 mainT 的 underfunded */
  const underfundedFor = async (target: any, assigned: number): Promise<number> => {
    await budgetService.upsertTarget(userId, mainT.id, target);
    await budgetService.assign(userId, '2026-05-01', mainT.id, assigned);
    const view = await budgetService.getMonthView(userId, '2026-05-01');
    return view.rows.find((r) => r.categoryId === mainT.id)!.underfunded;
  };

  it('underfunded 三型公式（carryIn=0）', async () => {
    // SET_ASIDE：amount − assigned
    expect(await underfundedFor({ type: 'SET_ASIDE', amount: 500 }, 300)).toBe(200);
    // REFILL：amount − carryIn − assigned
    expect(await underfundedFor({ type: 'REFILL', amount: 1000 }, 400)).toBe(600);
    // BALANCE_BY_DATE：缺口(1200) ÷ 剩餘月數(05→07 共 3) − assigned = 400 − 100
    expect(
      await underfundedFor(
        { type: 'BALANCE_BY_DATE', amount: 1200, dueDate: '2026-07-01' },
        100,
      ),
    ).toBe(300);
  });

  it('Auto-Assign UNDERFUNDED：補足缺口至達標', async () => {
    await budgetService.upsertTarget(userId, mainT.id, { type: 'REFILL', amount: 1000 } as any);
    await budgetService.assign(userId, '2026-05-01', mainT.id, 200);
    await budgetService.autoAssign(userId, '2026-05-01', 'UNDERFUNDED');
    const view = await budgetService.getMonthView(userId, '2026-05-01');
    const row = view.rows.find((r) => r.categoryId === mainT.id)!;
    expect(row.assigned).toBe(1000); // 200 + 缺口 800
    expect(row.underfunded).toBe(0);
  });

  it('Auto-Assign LAST_MONTH：本月各信封沿用上月 assigned', async () => {
    await budgetService.assign(userId, '2026-05-01', mainT.id, 700);
    await budgetService.autoAssign(userId, '2026-06-01', 'LAST_MONTH');
    const view = await budgetService.getMonthView(userId, '2026-06-01');
    const row = view.rows.find((r) => r.categoryId === mainT.id)!;
    expect(row.assigned).toBe(700);
  });

  it('target CRUD + 非 Main 拒絕', async () => {
    await budgetService.upsertTarget(userId, mainT.id, { type: 'SET_ASIDE', amount: 300 } as any);
    let view = await budgetService.getMonthView(userId, '2026-05-01');
    expect(view.rows.find((r) => r.categoryId === mainT.id)!.target).not.toBeNull();

    await budgetService.deleteTarget(userId, mainT.id);
    view = await budgetService.getMonthView(userId, '2026-05-01');
    const row = view.rows.find((r) => r.categoryId === mainT.id)!;
    expect(row.target).toBeNull();
    expect(row.underfunded).toBe(0);

    // Sub 層不可設 target
    await expect(
      budgetService.upsertTarget(userId, subT.id, { type: 'REFILL', amount: 100 } as any),
    ).rejects.toThrow(/Main/);
  });
});

/**
 * Phase 2 ④ — 信用卡完整機制（P2-D1～D6）。
 * 自足 fixture：bank(on-budget) + visa(on-budget 信用卡) + 一支出 Main。
 * 場景：5 月收入 1000、刷卡 50（covered）、分配 100；6 月還款 30。
 */
describe('YNAB 預算 Phase 2④：信用卡完整機制（P2-D1～D6）', () => {
  let userId: string;
  let bank: any;
  let visa: any;
  let mainC: any;
  let salaryCat: any;
  let transferCat: any;

  const baseTx = {
    description: 'p2d-test', time: '12:00:00', receipt: '',
    paymentFrequency: PaymentFrequency.ONE_TIME,
  };
  const expense = (a: string, c: string, amt: number, d: string) =>
    transactionServices.createTransaction(
      { ...baseTx, type: RootType.EXPENSE, accountId: a, categoryId: c, amount: amt, date: d } as any,
      userId,
    );
  const income = (a: string, c: string, amt: number, d: string) =>
    transactionServices.createTransaction(
      { ...baseTx, type: RootType.INCOME, accountId: a, categoryId: c, amount: amt, date: d } as any,
      userId,
    );
  const transfer = (a: string, t: string, amt: number, d: string, c: string) =>
    transactionServices.createTransfer(
      { ...baseTx, type: RootType.OPERATE, accountId: a, targetAccountId: t, categoryId: c, amount: amt, date: d } as any,
      userId,
    );

  beforeAll(async () => {
    clearRateCache();
    const uniqueEmail = `p2d-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(FAKE_NOW);
    const user = await User.create({
      name: 'P2D Test', email: uniqueEmail, password: 'hashed_pw_for_test',
      isGuest: false, baseCurrencyCode: 'TWD',
    } as any);
    userId = (user as any).id;
    bank = await Account.create({
      userId, name: 'P2D-Bank', type: '銀行', balance: 0,
      currencyCode: 'TWD', icon: 'bank', color: '#000', onBudget: true,
    } as any);
    visa = await Account.create({
      userId, name: 'P2D-Visa', type: '信用卡', balance: 0,
      currencyCode: 'TWD', icon: 'card', color: '#000', onBudget: true,
    } as any);

    const expenseRoot = await Category.findOne({ where: { type: RootType.EXPENSE, parentId: null } });
    mainC = await Category.findOne({
      where: { parentId: (expenseRoot as any).id, userId: null },
      order: [['createdAt', 'ASC']],
    });
    const incomeRoot = await Category.findOne({ where: { type: RootType.INCOME, parentId: null } });
    salaryCat = await Category.findOne({
      where: { parentId: (incomeRoot as any).id, userId: null },
      order: [['createdAt', 'ASC']],
    });
    const operateRoot = await Category.findOne({ where: { type: RootType.OPERATE, parentId: null } });
    transferCat = await Category.findOne({
      where: { parentId: (operateRoot as any).id, userId: null },
      order: [['createdAt', 'ASC']],
    });

    await income(bank.id, salaryCat.id, 1000, '2026-05-01'); // 收入 → RTA
    await expense(visa.id, mainC.id, 50, '2026-05-10'); // 刷卡 50
    await transfer(bank.id, visa.id, 30, '2026-06-05', transferCat.id); // 還款 30

    await budgetService.initBudget(userId, '2026-05-01');
    await budgetService.assign(userId, '2026-05-01', mainC.id, 100);
  });

  afterAll(async () => {
    await BudgetAssignment.destroy({ where: { userId } });
    await Transaction.destroy({ where: { userId }, force: true });
    await Account.destroy({ where: { userId }, force: true });
    await User.destroy({ where: { id: userId }, force: true });
    clearRateCache();
    vi.useRealTimers();
  });

  it('5 月：刷卡被覆蓋 covered 移入 CC Payment；信用卡不進 RTA', async () => {
    const view = await budgetService.getMonthView(userId, '2026-05-01');
    // startRTA 排除 visa：bank 起始 0；RTA = 0 + 1000 − 100 = 900
    expect(view.rtaBreakdown.startingBalance).toBe(0);
    expect(view.rtaBreakdown.cumulativeInflow).toBe(1000);
    expect(view.readyToAssign).toBe(900);

    const rowC = view.rows.find((r) => r.categoryId === mainC.id)!;
    expect(rowC.activity).toBe(-50);
    expect(rowC.available).toBe(50); // 100 − 50
    expect(rowC.overspendKind).toBeNull();

    expect(view.creditCardPayments.length).toBe(1);
    const cc = view.creditCardPayments[0]!;
    expect(cc.accountId).toBe(visa.id);
    expect(cc.covered).toBe(50);
    expect(cc.available).toBe(50);
    expect(cc.assigned).toBe(0);
    expect(cc.isDebt).toBe(false);
    expect(view.creditOverspending).toBe(0);
  });

  it('6 月：還款 bank→card 縮減 CC Payment available；不動 RTA', async () => {
    const view = await budgetService.getMonthView(userId, '2026-06-01');
    const cc = view.creditCardPayments[0]!;
    // 5 月 covered 50 結轉 − 6 月還款 30 = 20
    expect(cc.available).toBe(20);
    expect(cc.payments).toBe(30);
    expect(cc.activity).toBe(-30);
    // 還款為內部轉帳，不進 inflow/activity，RTA 不變
    expect(view.readyToAssign).toBe(900);
    const rowC = view.rows.find((r) => r.categoryId === mainC.id)!;
    expect(rowC.available).toBe(50); // 5 月結轉
  });

  it('cc-assign：撥備至 CC Payment 即扣 RTA、提升 available', async () => {
    await budgetService.ccAssign(userId, '2026-05-01', visa.id, 200);
    const view = await budgetService.getMonthView(userId, '2026-05-01');
    const cc = view.creditCardPayments[0]!;
    expect(cc.assigned).toBe(200);
    expect(cc.available).toBe(250); // 撥備 200 + covered 50
    expect(view.readyToAssign).toBe(700); // 900 − 200
    // 還原
    await budgetService.ccAssign(userId, '2026-05-01', visa.id, 0);
    const after = await budgetService.getMonthView(userId, '2026-05-01');
    expect(after.readyToAssign).toBe(900);
  });
});
