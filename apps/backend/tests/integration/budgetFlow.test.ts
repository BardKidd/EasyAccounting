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
    await income(bank.id, mainA.id, 20000, '2026-04-15');
    // 5 月：收入 + Sub 層支出（roll-up 到 mainA）+ 跨邊界轉出
    await income(bank.id, mainA.id, 5000, '2026-05-05');
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

  it('5 月視圖：startRTA 回推、Sub roll-up、跨邊界轉出虛擬列', async () => {
    const view = await budgetService.getMonthView(userId, '2026-05-01');

    // startRTA：bank 現值 18300 − Σ(起始後 −1700) = 20000；bank2 現值 1000 − 1000 = 0
    expect(view.rtaBreakdown.startingBalance).toBe(20000);
    expect(view.rtaBreakdown.cumulativeInflow).toBe(5000);
    expect(view.rtaBreakdown.cumulativeAssigned).toBe(3500);
    expect(view.rtaBreakdown.priorOverspending).toBe(0);
    // RTA = 20000 + 5000 − 3500 = 21500
    expect(view.readyToAssign).toBe(21500);

    // Sub 層支出 roll-up 到 mainA：2500 − 3000 = −500（超支）
    const rowA = view.rows.find((r) => r.categoryId === mainA.id)!;
    expect(rowA.assigned).toBe(2500);
    expect(rowA.activity).toBe(-3000);
    expect(rowA.available).toBe(-500);
    expect(rowA.isOverspent).toBe(true);

    const rowB = view.rows.find((r) => r.categoryId === mainB.id)!;
    expect(rowB.available).toBe(1000);

    // on-budget→tracking 轉出 2000 → 虛擬列
    expect(view.unclassifiedTransferOut).toEqual({
      activity: -2000,
      available: -2000,
    });
  });

  it('6 月視圖：前月 cash overspending 扣 RTA、結轉、tracking 轉入進 RTA、內部轉帳零影響', async () => {
    const view = await budgetService.getMonthView(userId, '2026-06-01');

    // priorOverspending = mainA −500 + 虛擬列 −2000 = −2500
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
    // 未來月份（Phase 2 才開放）
    await expect(
      budgetService.assign(userId, '2026-07-01', mainA.id, 100),
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
      budgetService.moveMoney(userId, '2026-07-01', null, mainA.id, 50),
    ).rejects.toThrow(/有效範圍/);
    // 啟用月之前的月份 assign 也被拒
    await expect(
      budgetService.assign(userId, '2026-04-01', mainA.id, 100),
    ).rejects.toThrow(/有效範圍/);
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
