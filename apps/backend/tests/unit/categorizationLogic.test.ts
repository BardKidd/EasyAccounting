import { describe, it, expect } from 'vitest';
import { RootType, RuleMatchMode } from '@repo/shared';
import {
  ruleMatches,
  applyRules,
  type RuleForMatch,
} from '@/logic/categorizationLogic';

const rule = (over: Partial<RuleForMatch>): RuleForMatch => ({
  id: over.id || 'r',
  descriptionMatch: null,
  matchMode: RuleMatchMode.CONTAINS,
  amountMin: null,
  amountMax: null,
  transactionType: null,
  setCategoryId: null,
  tagIds: [],
  ...over,
});

const draft = (over: Partial<{ description: string | null; amount: number; type: RootType }>) => ({
  description: 'STARBUCKS #123',
  amount: 150,
  type: RootType.EXPENSE,
  ...over,
});

describe('ruleMatches', () => {
  it('CONTAINS 不分大小寫', () => {
    expect(
      ruleMatches(rule({ descriptionMatch: 'starbucks' }), draft({})),
    ).toBe(true);
    expect(ruleMatches(rule({ descriptionMatch: '全家' }), draft({}))).toBe(
      false,
    );
  });

  it('EQUALS 需完全相等', () => {
    const r = rule({
      descriptionMatch: 'netflix',
      matchMode: RuleMatchMode.EQUALS,
    });
    expect(ruleMatches(r, draft({ description: 'Netflix' }))).toBe(true);
    expect(ruleMatches(r, draft({ description: 'Netflix 訂閱' }))).toBe(false);
  });

  it('STARTS_WITH 前綴', () => {
    const r = rule({
      descriptionMatch: '7-11',
      matchMode: RuleMatchMode.STARTS_WITH,
    });
    expect(ruleMatches(r, draft({ description: '7-11 大安店' }))).toBe(true);
    expect(ruleMatches(r, draft({ description: '全家 7-11 旁' }))).toBe(false);
  });

  it('description 為空時有條件即不命中', () => {
    expect(
      ruleMatches(rule({ descriptionMatch: 'x' }), draft({ description: null })),
    ).toBe(false);
  });

  it('金額區間含端點', () => {
    const r = rule({ amountMin: 100, amountMax: 200 });
    expect(ruleMatches(r, draft({ amount: 100 }))).toBe(true);
    expect(ruleMatches(r, draft({ amount: 200 }))).toBe(true);
    expect(ruleMatches(r, draft({ amount: 99 }))).toBe(false);
    expect(ruleMatches(r, draft({ amount: 201 }))).toBe(false);
  });

  it('transactionType 過濾', () => {
    const r = rule({ transactionType: RootType.INCOME });
    expect(ruleMatches(r, draft({ type: RootType.INCOME }))).toBe(true);
    expect(ruleMatches(r, draft({ type: RootType.EXPENSE }))).toBe(false);
  });

  it('多條件 AND：一項不符即不命中', () => {
    const r = rule({ descriptionMatch: 'starbucks', amountMin: 500 });
    expect(ruleMatches(r, draft({ amount: 150 }))).toBe(false);
    expect(ruleMatches(r, draft({ amount: 600 }))).toBe(true);
  });
});

describe('applyRules', () => {
  it('分類 first-match-wins（priority 順序），標籤取聯集', () => {
    const rules = [
      rule({ id: 'a', descriptionMatch: 'star', setCategoryId: 'cat-A', tagIds: ['t1'] }),
      rule({ id: 'b', descriptionMatch: 'bucks', setCategoryId: 'cat-B', tagIds: ['t2'] }),
    ];
    const res = applyRules(rules, draft({}));
    expect(res.categoryId).toBe('cat-A'); // 第一個命中的分類
    expect(res.tagIds.sort()).toEqual(['t1', 't2']); // 兩條的標籤聯集
  });

  it('第一命中規則無分類、後續有 → 用後續的分類', () => {
    const rules = [
      rule({ id: 'a', descriptionMatch: 'star', setCategoryId: null, tagIds: ['t1'] }),
      rule({ id: 'b', descriptionMatch: 'bucks', setCategoryId: 'cat-B' }),
    ];
    expect(applyRules(rules, draft({})).categoryId).toBe('cat-B');
  });

  it('不命中的規則不貢獻標籤/分類', () => {
    const rules = [
      rule({ id: 'a', descriptionMatch: '全家', setCategoryId: 'cat-A', tagIds: ['t1'] }),
      rule({ id: 'b', descriptionMatch: 'star', setCategoryId: 'cat-B', tagIds: ['t2'] }),
    ];
    const res = applyRules(rules, draft({}));
    expect(res.categoryId).toBe('cat-B');
    expect(res.tagIds).toEqual(['t2']);
  });

  it('validCategoryIds 跳過已刪分類的動作，但標籤仍套', () => {
    const rules = [
      rule({ id: 'a', descriptionMatch: 'star', setCategoryId: 'dead', tagIds: ['t1'] }),
      rule({ id: 'b', descriptionMatch: 'bucks', setCategoryId: 'cat-B', tagIds: ['t2'] }),
    ];
    const res = applyRules(rules, draft({}), {
      validCategoryIds: new Set(['cat-B']),
    });
    expect(res.categoryId).toBe('cat-B'); // 跳過 dead
    expect(res.tagIds.sort()).toEqual(['t1', 't2']); // 標籤仍聯集
  });

  it('無命中 → 分類 null、標籤空', () => {
    const res = applyRules([rule({ descriptionMatch: '無關' })], draft({}));
    expect(res.categoryId).toBeNull();
    expect(res.tagIds).toEqual([]);
  });
});
