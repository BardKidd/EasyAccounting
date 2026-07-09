/**
 * 交易搜尋 / 進階篩選「真實 DB」整合測試（Tier 2 — 交易搜尋 / 進階篩選）。
 *
 * 不 mock models / postgres，真的對 PostgreSQL 跑 getTransactionsByDate，覆蓋新增的：
 *   1. keyword：對 description 做不分大小寫子字串比對（Postgres ILIKE）。
 *   2. minAmount / maxAmount：對原幣 amount 做 >= / <= 範圍過濾（可只給一端）。
 *   3. keyword + 金額區間 + 既有日期範圍可疊加。
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

process.env.RESEND_API_KEY = 're_123';

import { RootType, PaymentFrequency } from '@repo/shared';
import { User, Account, Category } from '@/models';
import transactionServices from '@/services/transactionServices';

describe('交易搜尋 / 進階篩選 真實 DB 整合', () => {
  let userId: string;
  let accountId: string;
  let categoryId: string;

  beforeAll(async () => {
    const user = await User.create({
      name: 'Search Test',
      email: `search-${Date.now()}@example.com`,
      password: 'hashed_pw_for_test',
      isGuest: false,
      baseCurrencyCode: 'TWD',
    } as any);
    userId = (user as any).id;

    const account = await Account.create({
      userId,
      name: 'Search 帳戶',
      type: '銀行',
      balance: 0,
      currencyCode: 'TWD',
      icon: 'bank',
      color: '#000000',
    } as any);
    accountId = (account as any).id;

    const category = await Category.create({
      userId,
      name: 'Search 測試分類',
      type: RootType.EXPENSE,
      icon: 'shopping',
      color: '#10b981',
    } as any);
    categoryId = (category as any).id;

    // 三筆固定資料：描述與金額各異，供 keyword / 區間斷言
    await makeTx('星巴克咖啡', 150);
    await makeTx('麥當勞午餐', 80);
    await makeTx('Netflix 訂閱', 500);
  });

  afterAll(async () => {
    await User.destroy({ where: { id: userId }, individualHooks: true });
  });

  const makeTx = async (description: string, amount: number) => {
    const res: any = await transactionServices.createTransaction(
      {
        accountId,
        categoryId,
        amount,
        type: RootType.EXPENSE,
        date: '2026-07-15',
        time: '12:00:00',
        description,
        paymentFrequency: PaymentFrequency.ONE_TIME,
        receipt: null,
      } as any,
      userId,
    );
    return res.id as string;
  };

  const query = (extra: Record<string, unknown>) =>
    transactionServices.getTransactionsByDate(
      {
        startDate: '2026-07-01',
        endDate: '2026-07-31',
        limit: 100,
        ...extra,
      } as any,
      userId,
    );

  const descs = (list: any) => list.items.map((x: any) => x.description).sort();

  it('keyword 子字串比對 description', async () => {
    const list = await query({ keyword: '咖啡' });
    expect(descs(list)).toEqual(['星巴克咖啡']);
  });

  it('keyword 不分大小寫（ILIKE）', async () => {
    const list = await query({ keyword: 'netflix' });
    expect(descs(list)).toEqual(['Netflix 訂閱']);
  });

  it('keyword 無命中回空', async () => {
    const list = await query({ keyword: '不存在的關鍵字' });
    expect(list.items.length).toBe(0);
  });

  it('minAmount：只要 >= 下限', async () => {
    const list = await query({ minAmount: 100 });
    expect(descs(list)).toEqual(['Netflix 訂閱', '星巴克咖啡']);
  });

  it('maxAmount：只要 <= 上限', async () => {
    const list = await query({ maxAmount: 200 });
    expect(descs(list)).toEqual(['星巴克咖啡', '麥當勞午餐']);
  });

  it('minAmount + maxAmount：落在區間內', async () => {
    const list = await query({ minAmount: 100, maxAmount: 200 });
    expect(descs(list)).toEqual(['星巴克咖啡']);
  });

  it('keyword + 金額區間可疊加', async () => {
    // 「訂」命中 Netflix 訂閱(500)，但上限 300 濾掉 → 空
    const list = await query({ keyword: '訂', maxAmount: 300 });
    expect(list.items.length).toBe(0);
  });

  it('金額以字串進來（模擬 Express 5 req.query 唯讀）仍正確', async () => {
    // HTTP 路徑上 validate 的 coerce 寫不回 req.query，金額會以字串抵達 service
    const list = await query({ minAmount: '100', maxAmount: '200' });
    expect(descs(list)).toEqual(['星巴克咖啡']);
  });
});
