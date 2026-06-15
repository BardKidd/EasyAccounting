/**
 * 標籤（Tags）「真實 DB」整合測試 — 拆分交易+標籤 Phase A。
 *
 * 不 mock models / postgres，真的對 PostgreSQL 跑，覆蓋 spec §11 的重點：
 *   1. Tag CRUD：建立（同名冪等）、改名（撞名拒絕）、封存 list 過濾。
 *   2. 套用：建立交易帶 tagIds → getTransactionsByDate 回應夾帶 tags。
 *   3. 更新：updateIncomeExpense 改 tagIds（取代 / 清空）。
 *   4. 篩選：getTransactionsByDate ?tagIds match ANY。
 *   5. 串接刪除：刪 tag → transaction_tag 清掉、交易仍在；刪交易 → transaction_tag 清掉。
 *
 * ⚠️ 需先對測試 DB 跑 migration（含 20260614020000-create-tags）。
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

process.env.RESEND_API_KEY = 're_123';

import { RootType, PaymentFrequency } from '@repo/shared';
import {
  User,
  Account,
  Category,
  Transaction,
  Tag,
  TransactionTag,
} from '@/models';
import tagServices from '@/services/tagServices';
import transactionServices from '@/services/transactionServices';

describe('標籤 Tags 真實 DB 整合', () => {
  let userId: string;
  let accountId: string;
  let categoryId: string;

  beforeAll(async () => {
    const user = await User.create({
      name: 'Tag Test',
      email: `tag-${Date.now()}@example.com`,
      password: 'hashed_pw_for_test',
      isGuest: false,
      baseCurrencyCode: 'TWD',
    } as any);
    userId = (user as any).id;

    const account = await Account.create({
      userId,
      name: 'Tag 帳戶',
      type: '銀行',
      balance: 0,
      currencyCode: 'TWD',
      icon: 'bank',
      color: '#000000',
    } as any);
    accountId = (account as any).id;

    const category = await Category.create({
      userId,
      name: 'Tag 測試分類',
      type: RootType.EXPENSE,
      icon: 'shopping',
      color: '#10b981',
    } as any);
    categoryId = (category as any).id;
  });

  afterAll(async () => {
    // 串接刪除（User.afterDestroy → 交易/帳戶/分類/標籤）
    await User.destroy({ where: { id: userId }, individualHooks: true });
  });

  const makeTx = async (tagIds?: string[]) => {
    const res: any = await transactionServices.createTransaction(
      {
        accountId,
        categoryId,
        amount: 100,
        type: RootType.EXPENSE,
        date: '2026-06-15',
        time: '12:00:00',
        description: 'tag tx',
        paymentFrequency: PaymentFrequency.ONE_TIME,
        receipt: null,
        tagIds,
      } as any,
      userId,
    );
    return res.id as string;
  };

  it('createTag 同名（不分大小寫）冪等', async () => {
    const a = (await tagServices.createTag(userId, { name: '日本旅遊' })) as any;
    const b = (await tagServices.createTag(userId, { name: '日本旅遊' })) as any;
    expect(a.id).toBe(b.id);
  });

  it('updateTag 改名撞名應拒絕', async () => {
    const t1 = (await tagServices.createTag(userId, { name: '美食' })) as any;
    const t2 = (await tagServices.createTag(userId, { name: '交通' })) as any;
    await expect(
      tagServices.updateTag(userId, t2.id, { name: '美食' }),
    ).rejects.toThrow();
    // 原值不變
    const reload = await Tag.findByPk(t2.id);
    expect((reload as any).name).toBe('交通');
    expect(t1.id).toBeDefined();
  });

  it('listTags 預設不含封存', async () => {
    const t = (await tagServices.createTag(userId, { name: '封存測試' })) as any;
    await tagServices.updateTag(userId, t.id, { isArchived: true });
    const active = await tagServices.listTags(userId, false);
    const all = await tagServices.listTags(userId, true);
    expect(active.find((x: any) => x.id === t.id)).toBeUndefined();
    expect(all.find((x: any) => x.id === t.id)).toBeDefined();
  });

  it('建立交易帶 tagIds → 回應夾帶 tags', async () => {
    const tag = (await tagServices.createTag(userId, { name: '購物' })) as any;
    const txId = await makeTx([tag.id]);

    const list = await transactionServices.getTransactionsByDate(
      { startDate: '2026-06-01', endDate: '2026-06-30', limit: 100 } as any,
      userId,
    );
    const found = list.items.find((x: any) => x.id === txId) as any;
    expect(found).toBeDefined();
    expect(found.tags.map((t: any) => t.id)).toContain(tag.id);
  });

  it('?tagIds 篩選 match ANY', async () => {
    const tagA = (await tagServices.createTag(userId, { name: '篩選A' })) as any;
    const tagB = (await tagServices.createTag(userId, { name: '篩選B' })) as any;
    const txA = await makeTx([tagA.id]);
    const txB = await makeTx([tagB.id]);

    const onlyA = await transactionServices.getTransactionsByDate(
      {
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        limit: 100,
        tagIds: [tagA.id],
      } as any,
      userId,
    );
    const ids = onlyA.items.map((x: any) => x.id);
    expect(ids).toContain(txA);
    expect(ids).not.toContain(txB);
  });

  it('updateIncomeExpense 改 tagIds（取代後再清空）', async () => {
    const t1 = (await tagServices.createTag(userId, { name: '改前' })) as any;
    const t2 = (await tagServices.createTag(userId, { name: '改後' })) as any;
    const txId = await makeTx([t1.id]);

    await transactionServices.updateIncomeExpense(
      txId,
      { tagIds: [t2.id] } as any,
      userId,
    );
    let rows = await TransactionTag.findAll({
      where: { transactionId: txId },
    });
    expect(rows.map((r: any) => r.tagId)).toEqual([t2.id]);

    await transactionServices.updateIncomeExpense(
      txId,
      { tagIds: [] } as any,
      userId,
    );
    rows = await TransactionTag.findAll({ where: { transactionId: txId } });
    expect(rows.length).toBe(0);
  });

  it('刪 tag 串接清 transaction_tag，交易仍在', async () => {
    const tag = (await tagServices.createTag(userId, { name: '待刪' })) as any;
    const txId = await makeTx([tag.id]);

    await tagServices.deleteTag(userId, tag.id);

    const rows = await TransactionTag.findAll({ where: { tagId: tag.id } });
    expect(rows.length).toBe(0);
    const tx = await Transaction.findByPk(txId);
    expect(tx).not.toBeNull();
  });

  it('刪交易串接清 transaction_tag', async () => {
    const tag = (await tagServices.createTag(userId, { name: '隨交易刪' })) as any;
    const txId = await makeTx([tag.id]);

    await transactionServices.deleteTransaction(txId, userId);

    const rows = await TransactionTag.findAll({ where: { transactionId: txId } });
    expect(rows.length).toBe(0);
    // tag 本身還在
    const stillTag = await Tag.findByPk(tag.id);
    expect(stillTag).not.toBeNull();
  });
});
