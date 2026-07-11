/**
 * 規則引擎 resolveCategorization「真實 DB」整合測試 — Rules Engine Phase B。
 *
 * 覆蓋 rules-engine-spec R9/R12/R14：
 *   1. 規則命中：套分類（first-match-wins by priority）+ 標籤聯集。
 *   2. 停用規則不參與；per-user 隔離（B 的規則不影響 A）。
 *   3. fallback：無規則命中 → merchant_mapping（自查）→ ctx.llm → null。
 *   4. setCategory 指向軟刪分類 → 跳過分類動作，但標籤仍套。
 *
 * ⚠️ 需先跑 migration（含 20260711010000-create-transaction-rule）。
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

process.env.RESEND_API_KEY = 're_123';

import { RootType, RuleMatchMode } from '@repo/shared';
import {
  User,
  Category,
  Tag,
  TransactionRule,
  TransactionRuleTag,
  MerchantMapping,
} from '@/models';
import { resolveCategorization } from '@/services/categorizationService';

describe('resolveCategorization 真實 DB 整合', () => {
  let userA: string;
  let userB: string;
  let catA: string;
  let catA2: string;
  let catDead: string;
  let tag1: string;
  let tag2: string;

  const mkUser = async (t: string) => {
    const u = await User.create({
      name: `Rule ${t}`,
      email: `rule-${t}-${Date.now()}@example.com`,
      password: 'pw',
      isGuest: false,
      baseCurrencyCode: 'TWD',
    } as any);
    return (u as any).id as string;
  };
  const mkCat = async (userId: string, name: string) => {
    const c = await Category.create({
      userId,
      name,
      type: RootType.EXPENSE,
      icon: 'x',
      color: '#111',
    } as any);
    return (c as any).id as string;
  };
  const mkRule = async (userId: string, over: any) => {
    const r = (await TransactionRule.create({ userId, ...over } as any)) as any;
    return r.id as string;
  };
  const addRuleTag = async (ruleId: string, tagId: string) =>
    TransactionRuleTag.create({ ruleId, tagId } as any);

  beforeAll(async () => {
    userA = await mkUser('A');
    userB = await mkUser('B');
    catA = await mkCat(userA, 'A 餐飲');
    catA2 = await mkCat(userA, 'A 咖啡');
    catDead = await mkCat(userA, 'A 待刪');
    const t1 = (await Tag.create({ userId: userA, name: '規則標籤1' } as any)) as any;
    const t2 = (await Tag.create({ userId: userA, name: '規則標籤2' } as any)) as any;
    tag1 = t1.id;
    tag2 = t2.id;
  });

  afterAll(async () => {
    await User.destroy({ where: { id: userA }, individualHooks: true });
    await User.destroy({ where: { id: userB }, individualHooks: true });
  });

  it('規則命中：套分類 + 標籤，source=rule', async () => {
    const rid = await mkRule(userA, {
      name: '星巴克',
      priority: 10,
      descriptionMatch: 'starbucks',
      setCategoryId: catA,
    });
    await addRuleTag(rid, tag1);

    const res = await resolveCategorization(userA, {
      description: 'STARBUCKS #12',
      amount: 150,
      type: RootType.EXPENSE,
    });
    expect(res.categoryId).toBe(catA);
    expect(res.tagIds).toContain(tag1);
    expect(res.source).toBe('rule');
  });

  it('first-match-wins by priority + 標籤聯集', async () => {
    // priority 5 的規則（cat A2）應贏過 priority 10（catA），標籤兩者聯集
    const rid = await mkRule(userA, {
      name: '咖啡優先',
      priority: 5,
      descriptionMatch: 'star',
      setCategoryId: catA2,
    });
    await addRuleTag(rid, tag2);

    const res = await resolveCategorization(userA, {
      description: 'STARBUCKS #12',
      amount: 150,
      type: RootType.EXPENSE,
    });
    expect(res.categoryId).toBe(catA2); // priority 5 先
    expect(res.tagIds.sort()).toEqual([tag1, tag2].sort()); // 聯集
  });

  it('停用規則不參與', async () => {
    const rid = await mkRule(userB, {
      priority: 1,
      descriptionMatch: 'star',
      setCategoryId: await mkCat(userB, 'B cat'),
      isEnabled: false,
    });
    expect(rid).toBeDefined();
    // 對 B 而言此規則停用 → 無命中
    const res = await resolveCategorization(userB, {
      description: 'STARBUCKS',
      amount: 150,
      type: RootType.EXPENSE,
    });
    expect(res.categoryId).toBeNull();
    expect(res.source).toBe('none');
  });

  it('per-user 隔離：A 的規則不影響 B', async () => {
    const res = await resolveCategorization(userB, {
      description: 'STARBUCKS #12',
      amount: 150,
      type: RootType.EXPENSE,
    });
    // B 只有停用規則 → 無命中、無 merchant → null
    expect(res.categoryId).toBeNull();
  });

  it('fallback：無規則命中 → merchant_mapping 自查', async () => {
    await MerchantMapping.create({
      userId: userA,
      merchantName: '家樂福',
      categoryId: catA,
    } as any);
    const res = await resolveCategorization(userA, {
      description: '家樂福',
      amount: 300,
      type: RootType.EXPENSE,
    });
    expect(res.categoryId).toBe(catA);
    expect(res.source).toBe('merchant');
  });

  it('fallback：無規則、無 merchant → ctx.llm', async () => {
    const res = await resolveCategorization(
      userA,
      { description: '某不存在商家 xyz', amount: 50, type: RootType.EXPENSE },
      { merchantSuggestedCategoryId: null, llmSuggestedCategoryId: catA2 },
    );
    expect(res.categoryId).toBe(catA2);
    expect(res.source).toBe('llm');
  });

  it('setCategory 指向軟刪分類 → 跳過分類、標籤仍套', async () => {
    const rid = await mkRule(userA, {
      priority: 1,
      descriptionMatch: 'deadcat',
      setCategoryId: catDead,
    });
    await addRuleTag(rid, tag1);
    // 軟刪該分類
    await Category.destroy({ where: { id: catDead } });

    const res = await resolveCategorization(userA, {
      description: 'DEADCAT store',
      amount: 20,
      type: RootType.EXPENSE,
    });
    expect(res.categoryId).toBeNull(); // 跳過已刪分類，且無其他 fallback
    expect(res.tagIds).toContain(tag1); // 標籤仍套
  });
});
