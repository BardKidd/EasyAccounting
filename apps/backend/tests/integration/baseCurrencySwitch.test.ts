/**
 * 本位幣切換「真實 DB」整合測試（Phase 3，決策 Q1：用歷史匯率一次性重算）。
 *
 * 場景：本位 TWD → 切換成 USD。
 *   - TWD 帳戶交易 3200 → amountInBase 由 3200（TWD）重算為 100（USD，rate TWD→USD=0.03125）。
 *   - USD 帳戶交易 100 → amountInBase 由 3200（TWD）重算為 100（USD，rate USD→USD=1）。
 *   - 預算 1000（舊本位 TWD）→ 用今日匯率換算為 31.25（USD）。
 *   - 缺匯率時整批中止（另一個 case 驗證）。
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

process.env.RESEND_API_KEY = 're_123';

import { PaymentFrequency, RootType, ExchangeRateSource } from '@repo/shared';
import {
  User,
  Account,
  Transaction,
  ExchangeRate,
  Category,
  Budget,
} from '@/models';
import { BudgetCycleType } from '@/models/budget';
import transactionServices from '@/services/transactionServices';
import { changeBaseCurrency } from '@/services/baseCurrencyService';
import { clearRateCache } from '@/services/exchangeRateService';

const reload = async (id: string) => (await Transaction.findByPk(id)) as any;

describe('本位幣切換 真實 DB 整合（Q1 歷史重算）', () => {
  let userId: string;
  let twdAcc: any;
  let usdAcc: any;
  let categoryId: string;
  let twdTxId: string;
  let usdTxId: string;
  let budgetId: string;
  const RD = '2000-01-03';

  beforeAll(async () => {
    clearRateCache();
    const user = await User.create({
      name: 'BaseSwitch Test',
      email: `baseswitch-${Date.now()}@example.com`,
      password: 'hashed_pw_for_test',
      isGuest: false,
      baseCurrencyCode: 'TWD',
    } as any);
    userId = (user as any).id;

    twdAcc = await Account.create({
      userId, name: 'TWD', type: '銀行', balance: 0,
      currencyCode: 'TWD', icon: 'bank', color: '#000',
    } as any);
    usdAcc = await Account.create({
      userId, name: 'USD', type: '銀行', balance: 0,
      currencyCode: 'USD', icon: 'bank', color: '#000',
    } as any);

    // 兩向匯率：建立 USD 交易（base TWD）需 USD→TWD=32；切換成 USD base 需 TWD→USD=0.03125
    await ExchangeRate.create({ baseCode: 'USD', quoteCode: 'TWD', rate: 32, rateDate: RD, source: ExchangeRateSource.MANUAL } as any);
    await ExchangeRate.create({ baseCode: 'TWD', quoteCode: 'USD', rate: 0.03125, rateDate: RD, source: ExchangeRateSource.MANUAL } as any);

    const cat = await Category.findOne();
    categoryId = (cat as any).id;

    const baseTx = {
      categoryId,
      type: RootType.EXPENSE as const,
      description: 't',
      date: '2026-05-01',
      time: '12:00:00',
      receipt: '',
      paymentFrequency: PaymentFrequency.ONE_TIME,
    };
    const twdRes = await transactionServices.createTransaction(
      { ...baseTx, accountId: twdAcc.id, amount: 3200 } as any,
      userId,
    );
    twdTxId = (twdRes as any).createdTransactions?.[0]?.id || (await Transaction.findOne({ where: { userId, accountId: twdAcc.id } }) as any).id;
    const usdRes = await transactionServices.createTransaction(
      { ...baseTx, accountId: usdAcc.id, amount: 100 } as any,
      userId,
    );
    usdTxId = (usdRes as any).createdTransactions?.[0]?.id || (await Transaction.findOne({ where: { userId, accountId: usdAcc.id } }) as any).id;

    const budget = await Budget.create({
      userId, name: 'B', amount: 1000,
      cycleType: BudgetCycleType.MONTH, cycleStartDay: 1,
      startDate: '2026-05-01', isRecurring: false, rollover: false, isActive: true,
    } as any);
    budgetId = (budget as any).id;
  });

  afterAll(async () => {
    await Transaction.destroy({ where: { userId }, force: true });
    await Budget.destroy({ where: { userId }, force: true });
    await Account.destroy({ where: { userId }, force: true });
    await ExchangeRate.destroy({ where: { rateDate: RD }, force: true });
    await User.destroy({ where: { id: userId }, force: true });
    clearRateCache();
  });

  it('切換前：amountInBase 以 TWD 計（TWD 3200、USD 100→3200）', async () => {
    expect(Number((await reload(twdTxId)).amountInBase)).toBe(3200);
    expect(Number((await reload(usdTxId)).amountInBase)).toBe(3200);
  });

  it('切換 TWD→USD：歷史 amountInBase 重算、預算換算、user 本位更新', async () => {
    const result = await changeBaseCurrency(userId, 'USD');
    expect(result.changed).toBe(true);
    expect(result.oldBaseCode).toBe('TWD');
    expect(result.newBaseCode).toBe('USD');

    // TWD 3200 × (TWD→USD 0.03125) = 100
    const twdTx = await reload(twdTxId);
    expect(Number(twdTx.baseRate)).toBeCloseTo(0.03125, 6);
    expect(Number(twdTx.amountInBase)).toBeCloseTo(100, 5);

    // USD 100 × (USD→USD 1) = 100
    const usdTx = await reload(usdTxId);
    expect(Number(usdTx.baseRate)).toBe(1);
    expect(Number(usdTx.amountInBase)).toBeCloseTo(100, 5);

    // 預算 1000 TWD × 0.03125 = 31.25 USD
    const budget = await Budget.findByPk(budgetId);
    expect(Number((budget as any).amount)).toBeCloseTo(31.25, 5);

    // user 本位幣已更新
    const user = await User.findByPk(userId);
    expect((user as any).baseCurrencyCode).toBe('USD');
  });

  it('缺匯率時整批中止（切回不存在匯率的幣別應拋錯）', async () => {
    // 目前 base 已是 USD；切到 EUR 但未提供 USD/帳戶幣→EUR 匯率 → 應拋錯且不變更
    await expect(changeBaseCurrency(userId, 'EUR')).rejects.toThrow(/匯率/);
    const user = await User.findByPk(userId);
    expect((user as any).baseCurrencyCode).toBe('USD'); // 未被更動
  });
});
