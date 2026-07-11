/**
 * 帳單確認接線「真實 DB」整合測試 — Rules Engine Phase B（pdfService.confirmTransactions）。
 *
 * 覆蓋對抗式審查後補的兩個修復：
 *   1. 手動 pending 的英文 type（'expense'）正規化為 RootType（'支出'）→ 落地交易 type 正確，
 *      且帶 type 條件的規則能命中（修復前 'expense' !== '支出' 永不命中）。
 *   2. 確認時 transactionData.tagIds 可被 client 注入任意值 → 過濾為本人擁有的 tag，
 *      外人 tag 不得貼到自己交易。
 *
 * ⚠️ 需先跑 migration（含 transaction_rule）。全 TWD/TWD，不觸發匯率查詢。
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { v4 as uuidv4 } from 'uuid';

process.env.RESEND_API_KEY = 're_123';

import { RootType, RuleMatchMode, PendingTransactionStatus } from '@repo/shared';
import {
  User,
  Account,
  Category,
  Tag,
  TransactionRule,
  TransactionRuleTag,
  PendingTransaction,
} from '@/models';
import { confirmTransactions } from '@/services/pdfService';
import transactionServices from '@/services/transactionServices';

describe('帳單確認接線（confirmTransactions）真實 DB 整合', () => {
  let userA: string;
  let userB: string;
  let accountId: string;
  let catFood: string;
  let ruleTag: string;
  let foreignTag: string;

  const mkUser = async (t: string) => {
    const u = (await User.create({
      name: `PdfConfirm ${t}`,
      email: `pdfconfirm-${t}-${Date.now()}@example.com`,
      password: 'pw',
      isGuest: false,
      baseCurrencyCode: 'TWD',
    } as any)) as any;
    return u.id as string;
  };

  beforeAll(async () => {
    userA = await mkUser('A');
    userB = await mkUser('B');
    accountId = (
      (await Account.create({
        userId: userA,
        name: 'acc',
        type: '銀行',
        balance: 0,
        currencyCode: 'TWD',
        icon: 'bank',
        color: '#000',
      } as any)) as any
    ).id;
    catFood = (
      (await Category.create({
        userId: userA,
        name: '飲食',
        type: RootType.EXPENSE,
        icon: 'x',
        color: '#111',
      } as any)) as any
    ).id;
    ruleTag = ((await Tag.create({ userId: userA, name: '咖啡' } as any)) as any)
      .id;
    foreignTag = ((await Tag.create({ userId: userB, name: 'B私有' } as any)) as any)
      .id;

    // 規則：description 含 coffee 且 type=支出 → 套分類 catFood + 標籤 ruleTag
    const rule = (await TransactionRule.create({
      userId: userA,
      name: '咖啡規則',
      descriptionMatch: 'coffee',
      matchMode: RuleMatchMode.CONTAINS,
      transactionType: RootType.EXPENSE,
      setCategoryId: catFood,
    } as any)) as any;
    await TransactionRuleTag.create({ ruleId: rule.id, tagId: ruleTag } as any);
  });

  afterAll(async () => {
    await User.destroy({ where: { id: userA }, individualHooks: true });
    await User.destroy({ where: { id: userB }, individualHooks: true });
  });

  const mkPending = async (over: any) => {
    const pt = (await PendingTransaction.create({
      userId: userA,
      uploadBatchId: uuidv4(),
      rawMerchantName: '',
      suggestedCategoryId: null,
      matchedTransactionId: null,
      isInstallment: false,
      installmentNumber: null,
      status: PendingTransactionStatus.PENDING,
      transactionData: {
        amount: 100,
        type: 'expense',
        description: 'x',
        date: '2026-07-12',
        time: '10:00:00',
        accountId: null,
        categoryId: null,
        extraAdd: 0,
        extraMinus: 0,
        currency: 'TWD',
        ...over,
      },
    } as any)) as any;
    return pt.id as string;
  };

  const txByDescription = async (description: string) => {
    const list = await transactionServices.getTransactionsByDate(
      { startDate: '2026-07-01', endDate: '2026-07-31', limit: 200 } as any,
      userA,
    );
    return list.items.find((x: any) => x.description === description) as any;
  };

  it('英文 type expense 正規化 → 交易 type=支出，且帶 type 條件的規則命中', async () => {
    const ptId = await mkPending({
      type: 'expense',
      description: 'morning COFFEE',
    });
    await confirmTransactions(userA, [ptId], accountId);

    const tx = await txByDescription('morning COFFEE');
    expect(tx).toBeTruthy();
    expect(tx.type).toBe(RootType.EXPENSE); // 正規化：不再是英文 'expense'
    expect(tx.categoryId).toBe(catFood); // 規則命中（desc + type 皆符）
    expect((tx.tags || []).map((t: any) => t.id)).toContain(ruleTag);
  });

  it('確認時外人 tagId 被過濾，不得貼到自己交易', async () => {
    const ptId = await mkPending({
      type: 'expense',
      description: '全聯store',
      categoryId: catFood, // 使用者已選分類
      tagIds: [foreignTag], // client 注入的外人 tag
    });
    await confirmTransactions(userA, [ptId], accountId);

    const tx = await txByDescription('全聯store');
    expect(tx).toBeTruthy();
    const tagIds = (tx.tags || []).map((t: any) => t.id);
    expect(tagIds).not.toContain(foreignTag); // 外人 tag 濾掉
    expect(tagIds.length).toBe(0); // 無規則命中、無合法 provided tag
  });
});
