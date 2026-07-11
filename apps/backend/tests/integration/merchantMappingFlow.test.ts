/**
 * 商家→分類自動對應（merchant_mapping）「真實 DB」整合測試 — Rules Engine Phase A。
 *
 * 覆蓋 rules-engine-spec R2/R3/R5/R12/R14 的重點：
 *   1. 洩漏修復：batchSuggestCategories 只回本人對應，看不到他人 categoryId。
 *   2. per-user 隔離：list / update / delete 都以 userId scope。
 *   3. isEnabled：停用的對應不參與 billParse 匹配、預設 list 排除。
 *   4. 改分類：驗證分類擁有權（他人分類拒絕）、撞唯一鍵拒絕。
 *   5. 串接刪除：刪 User → 其 merchant_mapping 清空。
 *
 * ⚠️ 需先對測試 DB 跑 migration（含 20260711000000-merchant-mapping-per-user）。
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

process.env.RESEND_API_KEY = 're_123';

import { RootType } from '@repo/shared';
import { User, Category, MerchantMapping } from '@/models';
import { batchSuggestCategories } from '@/services/billParseService';
import merchantMappingServices from '@/services/merchantMappingServices';

describe('MerchantMapping 真實 DB 整合（per-user 隔離 + 洩漏修復）', () => {
  let userA: string;
  let userB: string;
  let catA: string;
  let catA2: string;
  let catB: string;

  const mkUser = async (tag: string) => {
    const u = await User.create({
      name: `MM ${tag}`,
      email: `mm-${tag}-${Date.now()}@example.com`,
      password: 'hashed_pw_for_test',
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
      icon: 'shopping',
      color: '#10b981',
    } as any);
    return (c as any).id as string;
  };

  beforeAll(async () => {
    userA = await mkUser('A');
    userB = await mkUser('B');
    catA = await mkCat(userA, 'A 餐飲');
    catA2 = await mkCat(userA, 'A 交通');
    catB = await mkCat(userB, 'B 餐飲');
  });

  afterAll(async () => {
    await User.destroy({ where: { id: userA }, individualHooks: true });
    await User.destroy({ where: { id: userB }, individualHooks: true });
  });

  it('洩漏修復：A 的對應不會回給 B（batchSuggestCategories 以 userId scope）', async () => {
    // 儲存的 merchantName 為帳單原始字串；billParse 查詢用交易 description。
    // 匹配以 merchantName ILIKE %description% 為前置條件，故用同字串模擬「重複商家」。
    await MerchantMapping.create({
      userId: userA,
      merchantName: '星巴克',
      categoryId: catA,
    } as any);

    const forA = await batchSuggestCategories(userA, ['星巴克']);
    const forB = await batchSuggestCategories(userB, ['星巴克']);

    expect(forA.get('星巴克')).toBe(catA); // 本人拿得到
    expect(forB.get('星巴克')).toBeNull(); // 他人拿不到（修洩漏）
  });

  it('isEnabled=false 的對應不參與匹配、預設 list 排除', async () => {
    const m = (await MerchantMapping.create({
      userId: userA,
      merchantName: '全聯福利中心',
      categoryId: catA,
    } as any)) as any;

    // 啟用時可匹配（先確認 fixture 有效，才知 null 是停用造成而非字串不符）
    const before = await batchSuggestCategories(userA, ['全聯福利中心']);
    expect(before.get('全聯福利中心')).toBe(catA);

    // 停用
    await merchantMappingServices.updateMerchantMapping(userA, m.id, {
      isEnabled: false,
    });

    const match = await batchSuggestCategories(userA, ['全聯福利中心']);
    expect(match.get('全聯福利中心')).toBeNull();

    const active = await merchantMappingServices.listMerchantMappings(
      userA,
      false,
    );
    const all = await merchantMappingServices.listMerchantMappings(userA, true);
    expect(active.find((x) => x.id === m.id)).toBeUndefined();
    expect(all.find((x) => x.id === m.id)).toBeDefined();
  });

  it('list 夾帶分類資訊、以 userId scope', async () => {
    const listA = await merchantMappingServices.listMerchantMappings(userA);
    const listB = await merchantMappingServices.listMerchantMappings(userB);
    const sb = listA.find((x) => x.merchantName === '星巴克');
    expect(sb).toBeDefined();
    expect(sb!.categoryName).toBe('A 餐飲');
    // B 完全看不到 A 的任何對應
    expect(listB.length).toBe(0);
  });

  it('update：他人無法改/刪本人對應（scope）', async () => {
    const m = (await MerchantMapping.create({
      userId: userA,
      merchantName: '誠品',
      categoryId: catA,
    } as any)) as any;

    await expect(
      merchantMappingServices.updateMerchantMapping(userB, m.id, {
        isEnabled: false,
      }),
    ).rejects.toThrow('對應不存在');
    await expect(
      merchantMappingServices.deleteMerchantMapping(userB, m.id),
    ).rejects.toThrow('對應不存在');
  });

  it('改分類：他人分類拒絕、本人分類成功', async () => {
    const m = (await MerchantMapping.create({
      userId: userA,
      merchantName: '中油',
      categoryId: catA,
    } as any)) as any;

    // 指向 B 的分類 → 拒絕
    await expect(
      merchantMappingServices.updateMerchantMapping(userA, m.id, {
        categoryId: catB,
      }),
    ).rejects.toThrow('分類不存在或無權限');

    // 指向本人另一分類 → 成功
    await merchantMappingServices.updateMerchantMapping(userA, m.id, {
      categoryId: catA2,
    });
    const reload = await MerchantMapping.findByPk(m.id);
    expect((reload as any).categoryId).toBe(catA2);
  });

  it('改分類撞唯一鍵拒絕（同商家同分類已存在）', async () => {
    await MerchantMapping.create({
      userId: userA,
      merchantName: '家樂福',
      categoryId: catA,
    } as any);
    const dup = (await MerchantMapping.create({
      userId: userA,
      merchantName: '家樂福',
      categoryId: catA2,
    } as any)) as any;

    await expect(
      merchantMappingServices.updateMerchantMapping(userA, dup.id, {
        categoryId: catA,
      }),
    ).rejects.toThrow('此商家已有相同分類的對應');
  });

  it('刪 User 串接清 merchant_mapping', async () => {
    const tmpUser = await mkUser('tmp');
    const tmpCat = await mkCat(tmpUser, 'tmp 分類');
    await MerchantMapping.create({
      userId: tmpUser,
      merchantName: '小七',
      categoryId: tmpCat,
    } as any);

    await User.destroy({ where: { id: tmpUser }, individualHooks: true });

    const rows = await MerchantMapping.findAll({
      where: { userId: tmpUser },
    });
    expect(rows.length).toBe(0);
  });
});
