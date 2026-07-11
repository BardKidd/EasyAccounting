/**
 * 規則引擎接線「真實 DB」整合測試 — Rules Engine Phase B（R10/R11）。
 *
 * 驗證手動新增（含 Excel 共用的 createTransaction）套規則：
 *   1. 命中規則 → 交易掛上規則標籤（與使用者提供者聯集）。
 *   2. 使用者已選分類不被覆蓋（fill-when-absent）。
 *   3. description 不符 → 不套。
 *   4. 編輯既有交易不套規則（no-retro / 只在新建）。
 *
 * ⚠️ 需先跑 migration（含 transaction_rule）。
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

process.env.RESEND_API_KEY = 're_123';

import { RootType, PaymentFrequency, RuleMatchMode } from '@repo/shared';
import { User, Account, Category, Tag, TransactionRule, TransactionRuleTag } from '@/models';
import transactionServices from '@/services/transactionServices';

describe('規則引擎接線（createTransaction）真實 DB 整合', () => {
  let userId: string;
  let accountId: string;
  let catFood: string;
  let catOther: string;
  let ruleTag: string;
  let userTag: string;

  beforeAll(async () => {
    const u = (await User.create({
      name: 'Wire',
      email: `wire-${Date.now()}@example.com`,
      password: 'pw',
      isGuest: false,
      baseCurrencyCode: 'TWD',
    } as any)) as any;
    userId = u.id;
    const acc = (await Account.create({
      userId,
      name: 'acc',
      type: '銀行',
      balance: 0,
      currencyCode: 'TWD',
      icon: 'bank',
      color: '#000',
    } as any)) as any;
    accountId = acc.id;
    catFood = ((await Category.create({ userId, name: '飲食', type: RootType.EXPENSE, icon: 'x', color: '#111' } as any)) as any).id;
    catOther = ((await Category.create({ userId, name: '其他', type: RootType.EXPENSE, icon: 'x', color: '#222' } as any)) as any).id;
    ruleTag = ((await Tag.create({ userId, name: '咖啡' } as any)) as any).id;
    userTag = ((await Tag.create({ userId, name: '報帳' } as any)) as any).id;

    // 規則：description 含 coffee → 套分類 catFood + 標籤 ruleTag
    const rule = (await TransactionRule.create({
      userId,
      name: '咖啡規則',
      descriptionMatch: 'coffee',
      matchMode: RuleMatchMode.CONTAINS,
      setCategoryId: catFood,
    } as any)) as any;
    await TransactionRuleTag.create({ ruleId: rule.id, tagId: ruleTag } as any);
  });

  afterAll(async () => {
    await User.destroy({ where: { id: userId }, individualHooks: true });
  });

  const create = async (over: any) => {
    const res: any = await transactionServices.createTransaction(
      {
        accountId,
        categoryId: catOther,
        amount: 100,
        type: RootType.EXPENSE,
        date: '2026-07-11',
        time: '12:00:00',
        description: 'COFFEE bar',
        paymentFrequency: PaymentFrequency.ONE_TIME,
        receipt: null,
        ...over,
      } as any,
      userId,
    );
    return res.id as string;
  };

  const tagsOf = async (txId: string) => {
    const list = await transactionServices.getTransactionsByDate(
      { startDate: '2026-07-01', endDate: '2026-07-31', limit: 200 } as any,
      userId,
    );
    const found = list.items.find((x: any) => x.id === txId) as any;
    return (found?.tags || []).map((t: any) => t.id);
  };

  it('命中規則 → 掛規則標籤；使用者已選分類不被覆蓋', async () => {
    const id = await create({ categoryId: catOther, description: 'COFFEE bar' });
    const tags = await tagsOf(id);
    expect(tags).toContain(ruleTag);
    // 分類仍為使用者選的 catOther（fill-when-absent，不覆蓋）
    const list = await transactionServices.getTransactionsByDate(
      { startDate: '2026-07-01', endDate: '2026-07-31', limit: 200 } as any,
      userId,
    );
    const found = list.items.find((x: any) => x.id === id) as any;
    expect(found.categoryId).toBe(catOther);
  });

  it('規則標籤與使用者提供標籤聯集', async () => {
    const id = await create({ description: 'coffee time', tagIds: [userTag] });
    const tags = await tagsOf(id);
    expect(tags.sort()).toEqual([ruleTag, userTag].sort());
  });

  it('description 不符 → 不套規則標籤', async () => {
    const id = await create({ description: '全聯', tagIds: [] });
    const tags = await tagsOf(id);
    expect(tags).not.toContain(ruleTag);
    expect(tags.length).toBe(0);
  });

  it('編輯既有交易不套規則（no-retro）', async () => {
    // 先建一筆不命中的（全聯），再把 description 改成 coffee → 不應自動掛規則標籤
    const id = await create({ description: '全聯', tagIds: [] });
    await transactionServices.updateIncomeExpense(
      id,
      { description: 'coffee now' } as any,
      userId,
    );
    const tags = await tagsOf(id);
    expect(tags).not.toContain(ruleTag);
  });
});
