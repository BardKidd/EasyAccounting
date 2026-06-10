/**
 * 跨幣轉帳「真實 DB」整合測試（Phase 2 最高風險區）。
 *
 * 不 mock models / postgres，真的對 PostgreSQL 跑，覆蓋計畫要求的四情境：
 *   1. 建立：from leg 用來源幣金額、to leg 用目標幣實收額，各自 baseRate 算 amountInBase，雙邊餘額正確。
 *   2. 改額：updateTransfer 改 amount/targetAmount → 餘額正確重算、amountInBase 同步。
 *   3. 改幣：updateTransfer 改目標帳戶（不同幣別）→ 舊帳戶沖銷、新帳戶套用、baseRate 重算。
 *   4. 刪除：deleteTransaction → 雙邊餘額完全還原。
 *
 * 金額語意驗證：amountInBase = amount × baseRate；100 USD（rate 32）== 3200 TWD。
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

process.env.RESEND_API_KEY = 're_123';

import {
  RootType,
  PaymentFrequency,
  ExchangeRateSource,
} from '@repo/shared';
import { User, Account, Transaction, ExchangeRate, Category } from '@/models';
import transactionServices from '@/services/transactionServices';

const balanceOf = async (id: string): Promise<number> => {
  const acc = await Account.findByPk(id);
  return Number((acc as any).balance);
};
const reload = async (id: string) => {
  const tx = await Transaction.findByPk(id);
  return tx as any;
};

describe('跨幣轉帳 真實 DB 整合', () => {
  let userId: string;
  let twdAcc: any; // 本位幣帳戶（TWD）
  let usdAcc: any; // 外幣帳戶（USD，rate 32）
  let eurAcc: any; // 外幣帳戶（EUR，rate 35）—用於「改幣」情境
  let categoryId: string;

  beforeAll(async () => {
    const user = await User.create({
      name: 'XCcy Transfer Test',
      email: `xccy-${Date.now()}@example.com`,
      password: 'hashed_pw_for_test',
      isGuest: false,
      baseCurrencyCode: 'TWD',
    } as any);
    userId = (user as any).id;

    twdAcc = await Account.create({
      userId,
      name: 'TWD 帳戶',
      type: '銀行',
      balance: 0,
      currencyCode: 'TWD',
      icon: 'bank',
      color: '#000000',
    } as any);
    usdAcc = await Account.create({
      userId,
      name: 'USD 帳戶',
      type: '銀行',
      balance: 0,
      currencyCode: 'USD',
      icon: 'bank',
      color: '#000000',
    } as any);
    eurAcc = await Account.create({
      userId,
      name: 'EUR 帳戶',
      type: '銀行',
      balance: 0,
      currencyCode: 'EUR',
      icon: 'bank',
      color: '#000000',
    } as any);

    // 測試專用匯率（用很早的 rateDate 確保被查到；rate 對 TWD）
    await ExchangeRate.create({
      baseCode: 'USD',
      quoteCode: 'TWD',
      rate: 32,
      rateDate: '2000-01-02',
      source: ExchangeRateSource.MANUAL,
    } as any);
    await ExchangeRate.create({
      baseCode: 'EUR',
      quoteCode: 'TWD',
      rate: 35,
      rateDate: '2000-01-02',
      source: ExchangeRateSource.MANUAL,
    } as any);

    // 任一既有分類 id（轉帳的分類不影響餘額邏輯，僅需通過 FK）
    const anyCat = await Category.findOne();
    categoryId = (anyCat as any)?.id;
  });

  afterAll(async () => {
    await Transaction.destroy({ where: { userId }, force: true });
    await Account.destroy({ where: { userId }, force: true });
    await ExchangeRate.destroy({
      where: { baseCode: ['USD', 'EUR'], rateDate: '2000-01-02' },
      force: true,
    });
    await User.destroy({ where: { id: userId }, force: true });
  });

  const baseTransferInput = () => ({
    accountId: twdAcc.id,
    targetAccountId: usdAcc.id,
    categoryId,
    amount: 3200, // TWD 付出
    targetAmount: 100, // USD 實收
    type: RootType.OPERATE as const,
    description: '跨幣轉帳測試',
    date: '2026-05-01',
    time: '12:00:00',
    receipt: '',
    paymentFrequency: PaymentFrequency.ONE_TIME,
  });

  let fromId: string;
  let toId: string;

  it('1. 建立：from=來源幣、to=目標幣，各自 baseRate 算 amountInBase，雙邊餘額正確', async () => {
    const res = await transactionServices.createTransfer(
      baseTransferInput() as any,
      userId,
    );
    fromId = (res.fromTransaction as any).id;
    toId = (res.toTransaction as any).id;

    const from = await reload(fromId);
    const to = await reload(toId);

    // from leg：TWD 3200，baseRate 1，amountInBase 3200
    expect(from.type).toBe(RootType.EXPENSE);
    expect(Number(from.amount)).toBe(3200);
    expect(Number(from.baseRate)).toBe(1);
    expect(Number(from.amountInBase)).toBe(3200);

    // to leg：USD 100，baseRate 32，amountInBase 3200
    expect(to.type).toBe(RootType.INCOME);
    expect(Number(to.amount)).toBe(100);
    expect(Number(to.baseRate)).toBe(32);
    expect(Number(to.amountInBase)).toBe(3200);

    // 餘額：TWD -3200、USD +100
    expect(await balanceOf(twdAcc.id)).toBe(-3200);
    expect(await balanceOf(usdAcc.id)).toBe(100);
  });

  it('2. 改額：amount 6400 / targetAmount 200 → 餘額與 amountInBase 同步重算', async () => {
    await transactionServices.updateTransfer(
      fromId,
      {
        amount: 6400,
        targetAmount: 200,
        targetAccountId: usdAcc.id,
      } as any,
      userId,
    );

    const from = await reload(fromId);
    const to = await reload(toId);
    expect(Number(from.amount)).toBe(6400);
    expect(Number(from.amountInBase)).toBe(6400);
    expect(Number(to.amount)).toBe(200);
    expect(Number(to.amountInBase)).toBe(6400); // 200 USD × 32

    expect(await balanceOf(twdAcc.id)).toBe(-6400);
    expect(await balanceOf(usdAcc.id)).toBe(200);
  });

  it('3. 改幣：目標帳戶換成 EUR → 舊 USD 沖銷、EUR 套用、baseRate 重算', async () => {
    await transactionServices.updateTransfer(
      fromId,
      {
        amount: 6400,
        targetAmount: 100, // 100 EUR
        targetAccountId: eurAcc.id,
      } as any,
      userId,
    );

    const to = await reload(toId);
    expect(to.accountId).toBe(eurAcc.id);
    expect(Number(to.amount)).toBe(100);
    expect(Number(to.baseRate)).toBe(35);
    expect(Number(to.amountInBase)).toBe(3500); // 100 EUR × 35

    // USD 帳戶被沖銷回 0，EUR 收到 100
    expect(await balanceOf(usdAcc.id)).toBe(0);
    expect(await balanceOf(eurAcc.id)).toBe(100);
    expect(await balanceOf(twdAcc.id)).toBe(-6400);
  });

  it('4. 刪除：雙邊餘額完全還原', async () => {
    await transactionServices.deleteTransaction(fromId, userId);

    expect(await balanceOf(twdAcc.id)).toBe(0);
    expect(await balanceOf(usdAcc.id)).toBe(0);
    expect(await balanceOf(eurAcc.id)).toBe(0);

    expect(await reload(fromId)).toBeNull();
    expect(await reload(toId)).toBeNull();
  });
});
