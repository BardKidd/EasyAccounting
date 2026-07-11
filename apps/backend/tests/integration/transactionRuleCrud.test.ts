/**
 * 規則 CRUD「真實 DB」整合測試 — Rules Engine Phase B。
 *
 * 覆蓋：create（分類/標籤擁有權驗證）、list（join + per-user scope）、update（改欄 + 換標籤）、
 * delete（cascade rule_tag）、reorder（priority by index、只動本人）、per-user 隔離。
 *
 * ⚠️ 需先跑 migration（含 20260711010000-create-transaction-rule）。
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

process.env.RESEND_API_KEY = 're_123';

import { RootType, RuleMatchMode } from '@repo/shared';
import { User, Category, Tag, TransactionRuleTag } from '@/models';
import svc from '@/services/transactionRuleServices';

describe('規則 CRUD 真實 DB 整合', () => {
  let userA: string;
  let userB: string;
  let catA: string;
  let catB: string;
  let tagA1: string;
  let tagA2: string;
  let tagB: string;

  const mkUser = async (t: string) => {
    const u = await User.create({
      name: `RuleCrud ${t}`,
      email: `rulecrud-${t}-${Date.now()}@example.com`,
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
  const mkTag = async (userId: string, name: string) => {
    const t = (await Tag.create({ userId, name } as any)) as any;
    return t.id as string;
  };

  beforeAll(async () => {
    userA = await mkUser('A');
    userB = await mkUser('B');
    catA = await mkCat(userA, 'A cat');
    catB = await mkCat(userB, 'B cat');
    tagA1 = await mkTag(userA, 'A規則標籤1');
    tagA2 = await mkTag(userA, 'A規則標籤2');
    tagB = await mkTag(userB, 'B規則標籤');
  });

  afterAll(async () => {
    await User.destroy({ where: { id: userA }, individualHooks: true });
    await User.destroy({ where: { id: userB }, individualHooks: true });
  });

  it('create：套分類 + 標籤，list 夾帶顯示資訊', async () => {
    const rule: any = await svc.createRule(userA, {
      name: '星巴克',
      descriptionMatch: 'starbucks',
      matchMode: RuleMatchMode.CONTAINS,
      setCategoryId: catA,
      tagIds: [tagA1],
    } as any);
    expect(rule.id).toBeDefined();

    const list = await svc.listRules(userA);
    const found = list.find((r) => r.id === rule.id)!;
    expect(found.setCategoryName).toBe('A cat');
    expect(found.tags.map((t) => t.id)).toEqual([tagA1]);
  });

  it('create：他人分類拒絕', async () => {
    await expect(
      svc.createRule(userA, {
        descriptionMatch: 'x',
        setCategoryId: catB,
      } as any),
    ).rejects.toThrow('分類不存在或無權限');
  });

  it('create：他人標籤拒絕', async () => {
    await expect(
      svc.createRule(userA, {
        descriptionMatch: 'x',
        setCategoryId: catA,
        tagIds: [tagB],
      } as any),
    ).rejects.toThrow('標籤不存在或無權限');
  });

  it('update：改欄 + 整組換標籤', async () => {
    const rule: any = await svc.createRule(userA, {
      descriptionMatch: 'old',
      setCategoryId: catA,
      tagIds: [tagA1],
    } as any);

    await svc.updateRule(userA, rule.id, {
      descriptionMatch: 'new',
      tagIds: [tagA2],
    } as any);

    const list = await svc.listRules(userA);
    const found = list.find((r) => r.id === rule.id)!;
    expect(found.descriptionMatch).toBe('new');
    expect(found.tags.map((t) => t.id)).toEqual([tagA2]); // 取代，非 append
  });

  it('delete：串接清 transaction_rule_tag', async () => {
    const rule: any = await svc.createRule(userA, {
      descriptionMatch: 'del',
      setCategoryId: catA,
      tagIds: [tagA1, tagA2],
    } as any);
    await svc.deleteRule(userA, rule.id);
    const rows = await TransactionRuleTag.findAll({
      where: { ruleId: rule.id },
    });
    expect(rows.length).toBe(0);
  });

  it('reorder：priority 依序、只動本人', async () => {
    const r1: any = await svc.createRule(userA, {
      descriptionMatch: 'r1',
      setCategoryId: catA,
    } as any);
    const r2: any = await svc.createRule(userA, {
      descriptionMatch: 'r2',
      setCategoryId: catA,
    } as any);
    await svc.reorderRules(userA, [r2.id, r1.id]);
    const list = await svc.listRules(userA);
    const p1 = list.find((r) => r.id === r1.id)!.priority;
    const p2 = list.find((r) => r.id === r2.id)!.priority;
    expect(p2).toBeLessThan(p1); // r2 排前面
  });

  it('per-user 隔離：他人無法改/刪本人規則', async () => {
    const rule: any = await svc.createRule(userA, {
      descriptionMatch: 'iso',
      setCategoryId: catA,
    } as any);
    await expect(
      svc.updateRule(userB, rule.id, { isEnabled: false } as any),
    ).rejects.toThrow('規則不存在');
    await expect(svc.deleteRule(userB, rule.id)).rejects.toThrow('規則不存在');
  });

  it('create：重複 tagId 去重（不撞 rule_tag 複合 PK）', async () => {
    const rule: any = await svc.createRule(userA, {
      descriptionMatch: 'dup',
      setCategoryId: catA,
      tagIds: [tagA1, tagA1],
    } as any);
    const rows = await TransactionRuleTag.findAll({
      where: { ruleId: rule.id },
    });
    expect(rows.length).toBe(1);
    expect((rows[0] as any).tagId).toBe(tagA1);
  });

  it('update：partial PUT 清空所有條件 → 合併後零條件被拒（規則不變式）', async () => {
    const rule: any = await svc.createRule(userA, {
      descriptionMatch: 'onlycond',
      setCategoryId: catA,
    } as any);
    await expect(
      svc.updateRule(userA, rule.id, {
        descriptionMatch: null,
        amountMin: null,
        amountMax: null,
        transactionType: null,
      } as any),
    ).rejects.toThrow('至少需一個條件');
    // 交易未被改動：原條件仍在
    const list = await svc.listRules(userA);
    expect(list.find((r) => r.id === rule.id)!.descriptionMatch).toBe('onlycond');
  });

  it('update：清掉分類與標籤 → 合併後零動作被拒', async () => {
    const rule: any = await svc.createRule(userA, {
      descriptionMatch: 'act',
      setCategoryId: catA,
      tagIds: [tagA1],
    } as any);
    await expect(
      svc.updateRule(userA, rule.id, {
        setCategoryId: null,
        tagIds: [],
      } as any),
    ).rejects.toThrow('至少需一個動作');
  });

  it('update：只改單邊金額造成反向區間被拒', async () => {
    const rule: any = await svc.createRule(userA, {
      amountMin: 100,
      amountMax: 200,
      setCategoryId: catA,
    } as any);
    await expect(
      svc.updateRule(userA, rule.id, { amountMin: 300 } as any),
    ).rejects.toThrow('amountMin 不可大於 amountMax');
  });
});
