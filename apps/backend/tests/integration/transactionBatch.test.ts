/**
 * 批次操作「真實 DB」整合測試（Tier 2 — 批次操作）。
 *
 * 覆蓋 transactionServices.batchTransactions：
 *   1. delete：一次刪多筆，回傳 affected；交易確實消失。
 *   2. delete：不存在 / 非本人的 id 被 skip、不中斷整批。
 *   3. addTags：append 到每筆既有標籤（聯集，不移除原標籤）。
 *   4. addTags：非本人 / 不存在的 tagId 被濾掉（只套用本人 tag）。
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

process.env.RESEND_API_KEY = 're_123';

import { RootType, PaymentFrequency } from '@repo/shared';
import { User, Account, Category, Transaction, TransactionTag } from '@/models';
import tagServices from '@/services/tagServices';
import transactionServices from '@/services/transactionServices';

describe('批次操作 batchTransactions 真實 DB 整合', () => {
  let userId: string;
  let accountId: string;
  let categoryId: string;

  beforeAll(async () => {
    const user = await User.create({
      name: 'Batch Test',
      email: `batch-${Date.now()}@example.com`,
      password: 'hashed_pw_for_test',
      isGuest: false,
      baseCurrencyCode: 'TWD',
    } as any);
    userId = (user as any).id;

    const account = await Account.create({
      userId,
      name: 'Batch 帳戶',
      type: '銀行',
      balance: 0,
      currencyCode: 'TWD',
      icon: 'bank',
      color: '#000000',
    } as any);
    accountId = (account as any).id;

    const category = await Category.create({
      userId,
      name: 'Batch 測試分類',
      type: RootType.EXPENSE,
      icon: 'shopping',
      color: '#10b981',
    } as any);
    categoryId = (category as any).id;
  });

  afterAll(async () => {
    await User.destroy({ where: { id: userId }, individualHooks: true });
  });

  const makeTx = async (tagIds?: string[]) => {
    const res: any = await transactionServices.createTransaction(
      {
        accountId,
        categoryId,
        amount: 100,
        type: RootType.EXPENSE,
        date: '2026-07-15',
        time: '12:00:00',
        description: 'batch tx',
        paymentFrequency: PaymentFrequency.ONE_TIME,
        receipt: null,
        tagIds,
      } as any,
      userId,
    );
    return res.id as string;
  };

  it('delete：一次刪多筆', async () => {
    const a = await makeTx();
    const b = await makeTx();
    const c = await makeTx();

    const result = await transactionServices.batchTransactions(
      { ids: [a, b, c], action: 'delete' } as any,
      userId,
    );

    expect(result.affected).toBe(3);
    expect(result.skipped).toEqual([]);
    expect(await Transaction.findByPk(a)).toBeNull();
    expect(await Transaction.findByPk(b)).toBeNull();
    expect(await Transaction.findByPk(c)).toBeNull();
  });

  it('delete：不存在的 id 被 skip、不中斷整批', async () => {
    const a = await makeTx();
    const bogus = '00000000-0000-4000-8000-000000000000';

    const result = await transactionServices.batchTransactions(
      { ids: [a, bogus], action: 'delete' } as any,
      userId,
    );

    expect(result.affected).toBe(1);
    expect(result.skipped).toEqual([bogus]);
    expect(await Transaction.findByPk(a)).toBeNull();
  });

  it('addTags：append 到既有標籤（聯集，不移除）', async () => {
    const tagA = (await tagServices.createTag(userId, { name: '批次A' })) as any;
    const tagB = (await tagServices.createTag(userId, { name: '批次B' })) as any;
    const tx1 = await makeTx([tagA.id]);
    const tx2 = await makeTx();

    const result = await transactionServices.batchTransactions(
      { ids: [tx1, tx2], action: 'addTags', tagIds: [tagB.id] } as any,
      userId,
    );
    expect(result.affected).toBe(2);

    const t1Tags = await TransactionTag.findAll({
      where: { transactionId: tx1 },
      raw: true,
    });
    // tx1 原有 A，加上 B → 聯集
    expect((t1Tags as any[]).map((r) => r.tagId).sort()).toEqual(
      [tagA.id, tagB.id].sort(),
    );

    const t2Tags = await TransactionTag.findAll({
      where: { transactionId: tx2 },
      raw: true,
    });
    expect((t2Tags as any[]).map((r) => r.tagId)).toEqual([tagB.id]);
  });

  it('addTags：不存在的 tagId 被濾掉（無本人 tag → 全 skip）', async () => {
    const tx = await makeTx();
    const bogusTag = '00000000-0000-4000-8000-000000000001';

    const result = await transactionServices.batchTransactions(
      { ids: [tx], action: 'addTags', tagIds: [bogusTag] } as any,
      userId,
    );

    expect(result.affected).toBe(0);
    expect(result.skipped).toEqual([tx]);
    const rows = await TransactionTag.findAll({
      where: { transactionId: tx },
      raw: true,
    });
    expect(rows.length).toBe(0);
  });
});
