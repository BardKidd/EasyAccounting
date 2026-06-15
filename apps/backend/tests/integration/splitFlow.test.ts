/**
 * 拆分交易（Split）「真實 DB」整合測試 — Phase B。
 *
 * 涵蓋 spec §6/§11 重點：
 *   - 配平不變量（Σ 子項 = 交易金額）、餘額零變更（拆分不改餘額路徑）。
 *   - DB view transaction_split_unit：非拆分=整筆一列；拆分=每子項一列、extra 按比例攤提，
 *     Σ 單元 net = 父 net（§6.2/§6.3）。
 *   - 更新重建 / 取消拆分 / 跨幣子項 amountInBase / 串接刪除 / 前置檢查。
 *
 * ⚠️ 需先對測試 DB 跑 migration（含 transaction_split 表與 transaction_split_unit view）。
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

process.env.RESEND_API_KEY = 're_123';

import { RootType, PaymentFrequency, ExchangeRateSource } from '@repo/shared';
import {
  User,
  Account,
  Category,
  Transaction,
  TransactionSplit,
  ExchangeRate,
} from '@/models';
import transactionServices from '@/services/transactionServices';
import sequelize from '@/utils/postgres';
import { QueryTypes } from 'sequelize';

describe('拆分交易 Split 真實 DB 整合', () => {
  let userId: string;
  let twdAcc: string;
  let usdAcc: string;
  let catA: string;
  let catB: string;
  let catC: string;

  beforeAll(async () => {
    // 用獨立 rateDate 避免與 crossCurrencyTransfer 的 USD→TWD@2000-01-02 撞 unique；
    // afterAll 會清理，不殘留。
    await ExchangeRate.findOrCreate({
      where: { baseCode: 'USD', quoteCode: 'TWD', rateDate: '2000-03-03' },
      defaults: { rate: 32, source: ExchangeRateSource.MANUAL } as any,
    });

    const user = await User.create({
      name: 'Split Test',
      email: `split-${Date.now()}@example.com`,
      password: 'hashed_pw_for_test',
      isGuest: false,
      baseCurrencyCode: 'TWD',
    } as any);
    userId = (user as any).id;

    const mkAcc = async (name: string, cur: string) =>
      (
        await Account.create({
          userId,
          name,
          type: '銀行',
          balance: 0,
          currencyCode: cur,
          icon: 'bank',
          color: '#000000',
          onBudget: true,
        } as any)
      ).id as string;
    twdAcc = await mkAcc('TWD 帳戶', 'TWD');
    usdAcc = await mkAcc('USD 帳戶', 'USD');

    const mkCat = async (name: string) =>
      (
        await Category.create({
          userId,
          name,
          type: RootType.EXPENSE,
          icon: 'x',
          color: '#10b981',
        } as any)
      ).id as string;
    catA = await mkCat('食材');
    catB = await mkCat('日用品');
    catC = await mkCat('其他');
  });

  afterAll(async () => {
    await User.destroy({ where: { id: userId }, individualHooks: true });
    await ExchangeRate.destroy({
      where: { baseCode: 'USD', quoteCode: 'TWD', rateDate: '2000-03-03' },
    });
  });

  const balOf = async (id: string) =>
    Number((await Account.findByPk(id))!.get('balance'));

  const unitsOf = (txId: string): Promise<any[]> =>
    sequelize.query(
      `SELECT "categoryId", "amountInBase", "extraAddInBase", "extraMinusInBase"
       FROM accounting.transaction_split_unit WHERE id = :id`,
      { replacements: { id: txId }, type: QueryTypes.SELECT },
    ) as any;

  const mkTx = (opts: {
    acc?: string;
    amount: number;
    splits?: { categoryId: string; amount: number }[];
    extraMinus?: number;
    desc?: string;
  }): Promise<any> =>
    transactionServices.createTransaction(
      {
        accountId: opts.acc ?? twdAcc,
        categoryId: catA,
        amount: opts.amount,
        type: RootType.EXPENSE,
        date: '2026-06-15',
        time: '12:00',
        description: opts.desc ?? 'split',
        receipt: null,
        paymentFrequency: PaymentFrequency.ONE_TIME,
        splits: opts.splits,
        extraMinus: opts.extraMinus,
      } as any,
      userId,
    );

  it('建立拆分：isSplit / 子項數 / 配平 / 餘額（無 extra 與非拆分相同）', async () => {
    const before = await balOf(twdAcc);
    const res = await mkTx({
      amount: 1200,
      splits: [
        { categoryId: catA, amount: 800 },
        { categoryId: catB, amount: 400 },
      ],
    });
    expect(res.isSplit).toBe(true);
    const splits = await TransactionSplit.findAll({
      where: { transactionId: res.id },
    });
    expect(splits.length).toBe(2);
    expect(await balOf(twdAcc)).toBeCloseTo(before - 1200, 2);
  });

  it('拆分 + 父層 extra：餘額含 extra；view 按比例攤提且 Σ = net（§6.3）', async () => {
    const before = await balOf(twdAcc);
    const res = await mkTx({
      amount: 1200,
      extraMinus: 6,
      splits: [
        { categoryId: catA, amount: 800 },
        { categoryId: catB, amount: 400 },
      ],
      desc: 'split+extra',
    });
    // 餘額 = amount + extraMinus（與非拆分一致）
    expect(await balOf(twdAcc)).toBeCloseTo(before - 1206, 2);

    const units = await unitsOf(res.id);
    expect(units.length).toBe(2);
    const netOf = (u: any) =>
      Number(u.amountInBase) +
      Number(u.extraMinusInBase) -
      Number(u.extraAddInBase);
    const byCat: Record<string, number> = {};
    for (const u of units) byCat[u.categoryId] = netOf(u);
    expect(byCat[catA]).toBeCloseTo(804, 2); // 800 + 6×800/1200
    expect(byCat[catB]).toBeCloseTo(402, 2); // 400 + 6×400/1200
    expect(netOf(units[0]) + netOf(units[1])).toBeCloseTo(1206, 2); // 不變量
  });

  it('view 對非拆分交易 = 整筆一列', async () => {
    const res = await mkTx({ amount: 500, desc: 'nosplit' });
    const units = await unitsOf(res.id);
    expect(units.length).toBe(1);
    expect(Number(units[0].amountInBase)).toBeCloseTo(500, 2);
  });

  it('更新拆分：重建子項、配平、金額未變則餘額不變', async () => {
    const res = await mkTx({
      amount: 1000,
      splits: [
        { categoryId: catA, amount: 600 },
        { categoryId: catB, amount: 400 },
      ],
      desc: 'upd',
    });
    const before = await balOf(twdAcc);
    await transactionServices.updateIncomeExpense(
      res.id,
      {
        amount: 1000,
        splits: [
          { categoryId: catA, amount: 300 },
          { categoryId: catC, amount: 700 },
        ],
      } as any,
      userId,
    );
    const splits = await TransactionSplit.findAll({
      where: { transactionId: res.id },
      order: [['sortOrder', 'ASC']],
    });
    expect(splits.map((s: any) => Number(s.amount))).toEqual([300, 700]);
    expect(splits.map((s: any) => s.categoryId)).toEqual([catA, catC]);
    expect(await balOf(twdAcc)).toBeCloseTo(before, 2);
  });

  it('取消拆分（splits:[]）：isSplit=false、子項清空', async () => {
    const res = await mkTx({
      amount: 900,
      splits: [
        { categoryId: catA, amount: 500 },
        { categoryId: catB, amount: 400 },
      ],
      desc: 'unsplit',
    });
    await transactionServices.updateIncomeExpense(
      res.id,
      { categoryId: catA, splits: [] } as any,
      userId,
    );
    const tx = await Transaction.findByPk(res.id);
    expect((tx as any).isSplit).toBe(false);
    expect(
      (await TransactionSplit.findAll({ where: { transactionId: res.id } }))
        .length,
    ).toBe(0);
  });

  it('跨幣拆分：各子項 amountInBase 用 baseRate；Σ = 父 amountInBase（100 USD→3200）', async () => {
    const res = await mkTx({
      acc: usdAcc,
      amount: 100,
      splits: [
        { categoryId: catA, amount: 60 },
        { categoryId: catB, amount: 40 },
      ],
      desc: 'xccy',
    });
    const splits = await TransactionSplit.findAll({
      where: { transactionId: res.id },
    });
    const sumBase = splits.reduce(
      (s: number, x: any) => s + Number(x.amountInBase),
      0,
    );
    const tx = await Transaction.findByPk(res.id);
    expect(sumBase).toBeCloseTo(Number((tx as any).amountInBase), 2);
    expect(sumBase).toBeCloseTo(3200, 2);
  });

  it('刪除拆分交易：子項串接刪除、餘額還原', async () => {
    const before = await balOf(twdAcc);
    const res = await mkTx({
      amount: 777,
      splits: [
        { categoryId: catA, amount: 400 },
        { categoryId: catB, amount: 377 },
      ],
      desc: 'del',
    });
    await transactionServices.deleteTransaction(res.id, userId);
    expect(
      (await TransactionSplit.findAll({ where: { transactionId: res.id } }))
        .length,
    ).toBe(0);
    expect(await balOf(twdAcc)).toBeCloseTo(before, 2);
  });

  it('前置檢查：配平不符 / 少於 2 子項 應拒絕', async () => {
    await expect(
      mkTx({
        amount: 1000,
        splits: [
          { categoryId: catA, amount: 600 },
          { categoryId: catB, amount: 300 },
        ],
        desc: 'bad-balance',
      }),
    ).rejects.toThrow();
    await expect(
      mkTx({
        amount: 1000,
        splits: [{ categoryId: catA, amount: 1000 }],
        desc: 'one-split',
      }),
    ).rejects.toThrow();
  });
});
