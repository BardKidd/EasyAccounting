import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RootType } from '@repo/shared';

// Mock 重用的 service / model，讓 dispatcher 測試與真正 DB 解耦
vi.mock('@/services/statisticsServices', () => ({
  default: {
    getCategoryTabData: vi.fn(),
    getOverviewTrend: vi.fn(),
    getOverviewTop3Expenses: vi.fn(),
  },
}));
vi.mock('@/services/transactionServices', () => ({
  default: {
    getTransactionsByDate: vi.fn(),
  },
}));
vi.mock('@/models/category', () => ({ default: { findAll: vi.fn() } }));
vi.mock('@/models/account', () => ({
  default: { findOne: vi.fn(), findAll: vi.fn() },
}));

import { executeChatTool } from '@/services/chatTools';
import statisticsServices from '@/services/statisticsServices';
import transactionServices from '@/services/transactionServices';
import Category from '@/models/category';
import Account from '@/models/account';

const USER_ID = 'user-abc';
const CAT_UUID = '11111111-1111-1111-1111-111111111111';
const ACC_UUID = '22222222-2222-2222-2222-222222222222';

describe('executeChatTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('query_spending_by_category', () => {
    it('queries with the injected userId and returns sorted expenses', async () => {
      (statisticsServices.getCategoryTabData as any).mockResolvedValue([
        { name: '飲食', amount: 1200, count: 5, type: RootType.EXPENSE, isTransfer: false },
        { name: '交通', amount: 300, count: 2, type: RootType.EXPENSE, isTransfer: false },
        { name: '薪水', amount: 50000, count: 1, type: RootType.INCOME, isTransfer: false },
      ]);

      const result = await executeChatTool(
        'query_spending_by_category',
        { startDate: '2026-06-01', endDate: '2026-06-30' },
        USER_ID,
      );

      // 一律以注入的 userId 查詢
      expect(statisticsServices.getCategoryTabData).toHaveBeenCalledWith(
        { startDate: '2026-06-01', endDate: '2026-06-30' },
        USER_ID,
      );

      const payload = JSON.parse(result.content);
      // 只保留支出且由高到低
      expect(payload.expenses).toEqual([
        { category: '飲食', amount: 1200, count: 5 },
        { category: '交通', amount: 300, count: 2 },
      ]);
    });

    it('blocks invalid args without calling the service', async () => {
      const result = await executeChatTool(
        'query_spending_by_category',
        { startDate: 'not-a-date' },
        USER_ID,
      );

      expect(result.content).toContain('參數錯誤');
      expect(statisticsServices.getCategoryTabData).not.toHaveBeenCalled();
    });
  });

  describe('query_transactions', () => {
    it('post-filters by keyword and amount, capping the result', async () => {
      (transactionServices.getTransactionsByDate as any).mockResolvedValue({
        items: [
          { date: '2026-06-02', amount: 120, type: RootType.EXPENSE, description: '咖啡' },
          { date: '2026-06-03', amount: 50, type: RootType.EXPENSE, description: '公車' },
          { date: '2026-06-04', amount: 200, type: RootType.EXPENSE, description: '咖啡豆' },
        ],
        pagination: {},
      });

      const result = await executeChatTool(
        'query_transactions',
        { keyword: '咖啡', minAmount: 100 },
        USER_ID,
      );

      expect(transactionServices.getTransactionsByDate).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1 }),
        USER_ID,
      );
      const payload = JSON.parse(result.content);
      expect(payload.transactions).toHaveLength(2);
      expect(payload.transactions.map((t: any) => t.description)).toEqual(['咖啡', '咖啡豆']);
    });
  });

  describe('list_categories', () => {
    it('lists categories of a given type', async () => {
      (Category.findAll as any).mockResolvedValue([
        { name: '餐飲', parentId: 'p1' },
        { name: '稅金', parentId: 'p2' },
      ]);

      const result = await executeChatTool(
        'list_categories',
        { type: RootType.EXPENSE },
        USER_ID,
      );

      const payload = JSON.parse(result.content);
      expect(payload.type).toBe(RootType.EXPENSE);
      expect(payload.categories).toEqual(['餐飲', '稅金']);
    });

    it('lists both expense and income categories when no type is given', async () => {
      (Category.findAll as any)
        .mockResolvedValueOnce([{ name: '餐飲', parentId: 'p1' }]) // expense
        .mockResolvedValueOnce([{ name: '薪水', parentId: 'p2' }]); // income

      const result = await executeChatTool('list_categories', {}, USER_ID);

      const payload = JSON.parse(result.content);
      expect(payload.expense).toEqual(['餐飲']);
      expect(payload.income).toEqual(['薪水']);
    });
  });

  describe('list_accounts', () => {
    it('lists the user accounts', async () => {
      (Account.findAll as any).mockResolvedValue([
        { name: '日常錢包' },
        { name: '國泰 CUBE 卡' },
      ]);

      const result = await executeChatTool('list_accounts', {}, USER_ID);

      const payload = JSON.parse(result.content);
      expect(payload.accounts).toEqual(['日常錢包', '國泰 CUBE 卡']);
    });
  });

  describe('create_transaction (draft only)', () => {
    it('resolves names to ids and returns a draft event without writing', async () => {
      (Category.findAll as any).mockResolvedValue([
        { id: CAT_UUID, name: '飲料', parentId: 'parent-x' },
      ]);
      (Account.findOne as any).mockResolvedValue({ id: ACC_UUID, name: '現金' });

      const result = await executeChatTool(
        'create_transaction',
        { amount: 120, type: RootType.EXPENSE, categoryName: '飲料', date: '2026-06-05' },
        USER_ID,
      );

      expect(result.event).toBeDefined();
      expect(result.event!.type).toBe('draft');
      expect(result.event!.draft).toMatchObject({
        amount: 120,
        type: RootType.EXPENSE,
        date: '2026-06-05',
        accountId: ACC_UUID,
        categoryId: CAT_UUID,
        categoryName: '飲料',
      });
    });

    it('fuzzy-matches a near category name (稅務支出 → 稅金) and drafts', async () => {
      (Category.findAll as any)
        .mockResolvedValueOnce([]) // 精準 iLike「稅務支出」→ 無
        .mockResolvedValueOnce([
          { id: CAT_UUID, name: '稅金', parentId: 'p1' },
        ]); // 該類型候選，於記憶體模糊比對
      // 未指定帳戶 → 取第一個帳戶
      (Account.findOne as any).mockResolvedValue({ id: ACC_UUID, name: '現金' });

      const result = await executeChatTool(
        'create_transaction',
        {
          amount: 2600,
          type: RootType.EXPENSE,
          categoryName: '稅務支出',
          date: '2026-06-06',
        },
        USER_ID,
      );

      expect(result.event).toBeDefined();
      expect(result.event!.draft).toMatchObject({
        amount: 2600,
        categoryId: CAT_UUID,
        categoryName: '稅金',
      });
    });

    it('fuzzy-matches a near account name (現金 → 現金錢包)', async () => {
      (Category.findAll as any).mockResolvedValue([
        { id: CAT_UUID, name: '飲料', parentId: 'p1' },
      ]);
      // 精準帳戶找不到 → 取全部帳戶做模糊比對
      (Account.findOne as any).mockResolvedValue(null);
      (Account.findAll as any).mockResolvedValue([
        { id: ACC_UUID, name: '現金錢包' },
        { id: 'other-acc', name: '國泰 CUBE 卡' },
      ]);

      const result = await executeChatTool(
        'create_transaction',
        {
          amount: 120,
          type: RootType.EXPENSE,
          categoryName: '飲料',
          accountName: '現金',
        },
        USER_ID,
      );

      expect(result.event).toBeDefined();
      expect(result.event!.draft).toMatchObject({
        accountId: ACC_UUID,
        accountName: '現金錢包',
      });
    });

    it('returns a friendly error (no event) when category cannot be resolved', async () => {
      (Category.findAll as any).mockResolvedValue([]);

      const result = await executeChatTool(
        'create_transaction',
        { amount: 120, type: RootType.EXPENSE, categoryName: '不存在的分類' },
        USER_ID,
      );

      expect(result.event).toBeUndefined();
      expect(result.content).toContain('找不到');
    });

    it('lists the available accounts (no event) when the named account is not found', async () => {
      (Category.findAll as any).mockResolvedValue([
        { id: CAT_UUID, name: '稅金', parentId: 'parent-x' },
      ]);
      // resolveAccount：精準 + 子字串兩次 findOne 都找不到
      (Account.findOne as any).mockResolvedValue(null);
      // listAccountNames：回傳使用者實際擁有的帳戶
      (Account.findAll as any).mockResolvedValue([
        { name: '日常錢包' },
        { name: '國泰 CUBE 卡' },
      ]);

      const result = await executeChatTool(
        'create_transaction',
        {
          amount: 2600,
          type: RootType.EXPENSE,
          categoryName: '稅金',
          accountName: '現金',
        },
        USER_ID,
      );

      expect(result.event).toBeUndefined();
      // 訊息要列出可選帳戶，讓模型能回問使用者，而不是回空白或亂選
      expect(result.content).toContain('日常錢包');
      expect(result.content).toContain('國泰 CUBE 卡');
    });

    it('lists the available categories (no event) when the category is not found', async () => {
      // resolveCategoryId：精準[] → 子字串[] → null；listCategoryNames：回實際分類
      (Category.findAll as any)
        .mockResolvedValueOnce([]) // exact
        .mockResolvedValueOnce([]) // fuzzy
        .mockResolvedValueOnce([
          { name: '稅金', parentId: 'p1' },
          { name: '其他支出', parentId: 'p2' },
        ]);

      const result = await executeChatTool(
        'create_transaction',
        { amount: 2600, type: RootType.EXPENSE, categoryName: '繳稅' },
        USER_ID,
      );

      expect(result.event).toBeUndefined();
      // 必須列出使用者實際擁有的分類，避免模型幻想
      expect(result.content).toContain('稅金');
      expect(result.content).toContain('其他支出');
    });

    it('blocks invalid args (negative amount) without resolving anything', async () => {
      const result = await executeChatTool(
        'create_transaction',
        { amount: -5, type: RootType.EXPENSE, categoryName: '飲料' },
        USER_ID,
      );

      expect(result.content).toContain('參數錯誤');
      expect(Category.findAll).not.toHaveBeenCalled();
    });
  });
});
