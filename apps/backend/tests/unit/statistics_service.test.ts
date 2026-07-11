import { describe, it, expect, vi, beforeEach } from 'vitest';
import statisticsServices from '@/services/statisticsServices';
import Transaction from '@/models/transaction';
import Account from '@/models/account';
import { RootType } from '@repo/shared';
// Mock dependencies
import sequelize from '@/utils/postgres';

vi.mock('@/models/transaction', () => ({
  default: {
    findAll: vi.fn(),
  },
}));

vi.mock('@/models/category', () => ({ default: {} }));
vi.mock('@/models/account', () => ({
  default: {
    sum: vi.fn(),
  },
}));
vi.mock('@/models/TransactionExtra', () => ({ default: {} }));

// getNetWorth 透過 exchangeRateService.getRate 換算；單元測試固定回 1（同/本位幣）
vi.mock('@/services/exchangeRateService', () => ({
  getRate: vi.fn().mockResolvedValue(1),
}));

// Mock sequelize instance
vi.mock('@/utils/postgres', () => {
  const queryFn = vi.fn();
  return {
    default: {
      query: queryFn,
      col: (name: string) => name,
      fn: (fnName: string, col: any) => `${fnName}(${col})`,
      literal: (str: string) => str,
    },
  };
});

describe('Statistics Services', () => {
  const mockUserId = 'user-123';
  const mockDateRange = { startDate: '2023-01-01', endDate: '2023-01-31' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getOverviewTrend', () => {
    it('should calculate income, expense, transfer and balance correctly', async () => {
      // 單幣：amountInBase === amount、extra*InBase === extra*（聚合改讀本位幣快照）
      const mockTransactions = [
        {
          amount: 100,
          amountInBase: 100,
          type: RootType.INCOME,
          targetAccountId: null,
          transactionExtra: {
            extraAdd: 10,
            extraMinus: 5,
            extraAddInBase: 10,
            extraMinusInBase: 5,
          }, // Net: 100 - 5 + 10 = 105
        },
        {
          amount: 50,
          amountInBase: 50,
          type: RootType.EXPENSE,
          targetAccountId: null,
          transactionExtra: {
            extraAdd: 2,
            extraMinus: 4,
            extraAddInBase: 2,
            extraMinusInBase: 4,
          }, // Net: 50 + 4 - 2 = 52
        },
        {
          amount: 200,
          amountInBase: 200,
          type: RootType.EXPENSE,
          targetAccountId: 'acc-2', // Transfer Out
          transactionExtra: {
            extraAdd: 0,
            extraMinus: 10,
            extraAddInBase: 0,
            extraMinusInBase: 10,
          }, // Net: 200 + 10 = 210
        },
        {
          amount: 200,
          amountInBase: 200,
          type: RootType.INCOME,
          targetAccountId: 'acc-1', // Transfer In
        },
      ];

      (Transaction.findAll as any).mockResolvedValue(mockTransactions);

      const result = await statisticsServices.getOverviewTrend(
        mockDateRange,
        mockUserId
      );

      // Income: 105
      // Expense: 52
      // TransferOut: 210
      // TransferIn: 200
      // Balance: 105 - 52 + 200 - 210 = 43

      expect(result).toEqual({
        income: 105,
        expense: 52,
        transferOut: 210,
        transferIn: 200,
        balance: 43,
      });
      expect(Transaction.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: mockUserId }),
        })
      );
    });
  });

  describe('getOverviewTop3Categories (Raw SQL)', () => {
    it('should format raw query result correctly', async () => {
      const mockRawResult = [
        {
          categoryId: 1,
          categoryName: 'Food',
          categoryIcon: 'food-icon',
          categoryColor: 'red',
          amount: 500,
        },
      ];

      (sequelize.query as any).mockResolvedValue(mockRawResult);

      const result = await statisticsServices.getOverviewTop3Categories(
        mockDateRange,
        mockUserId
      );

      expect(result).toHaveLength(1);
      expect(result[0]!.category.name).toBe('Food');
      expect(result[0]!.amount).toBe(500);
      expect(sequelize.query).toHaveBeenCalled();
    });
  });

  describe('getOverviewTop3Expenses', () => {
    it('should return top 3 expenses with net amount calculation', async () => {
      const mockTransactions = [
        {
          id: 1,
          amount: 100,
          amountInBase: 100,
          type: RootType.EXPENSE,
          category: { name: 'Food' },
          transactionExtra: {
            extraAdd: 10,
            extraMinus: 20,
            extraAddInBase: 10,
            extraMinusInBase: 20,
          }, // Net: 100 + 20 - 10 = 110
        },
      ];

      (Transaction.findAll as any).mockResolvedValue(mockTransactions);

      const result = await statisticsServices.getOverviewTop3Expenses(
        mockDateRange,
        mockUserId
      );

      expect(result[0].amount).toBe(110);
    });
  });

  describe('getDetailTabData', () => {
    it('should format detail data correctly', async () => {
      const mockData = [
        {
          id: 1,
          category: {
            id: 10,
            name: 'Sub',
            parent: { id: 1, name: 'Main', color: 'blue', icon: 'icon' },
          },
          targetAccount: { name: 'Bank' },
        },
      ];
      (Transaction.findAll as any).mockResolvedValue(mockData);

      const result = await statisticsServices.getDetailTabData(
        mockDateRange,
        mockUserId
      );

      expect(result[0].category.name).toBe('Sub');
      expect(result[0].category.color).toBe('blue'); // Inherited from parent
      expect(result[0].targetAccountName).toBe('Bank');
    });
  });

  describe('getAssetTrend', () => {
    it('should calculate asset trend correctly', async () => {
      // getNetWorth 移至 getAssetTrend 開頭，故 sequelize.query 呼叫序列：
      // 1) getNetWorth 本位幣 2) getNetWorth 各幣餘額 3) 日期範圍 4) 每月統計
      (sequelize.query as any)
        .mockResolvedValueOnce([{ baseCurrencyCode: 'TWD' }]) // 1. 本位幣
        .mockResolvedValueOnce([{ currencyCode: 'TWD', balance: '1000' }]) // 2. 各幣餘額（單幣 getRate=1 → totalInBase=1000）
        .mockResolvedValueOnce([{ startDate: '2023-01-01' }]) // 3. date range
        .mockResolvedValueOnce([
          // 4. monthly stats
          {
            year: '2023',
            month: '01',
            netFlow: 100,
            income: 200,
            expense: 100,
          },
        ]);

      const result = await statisticsServices.getAssetTrend(mockUserId);

      // 2 次（getNetWorth：本位幣 + 各幣餘額）+ 2 次（getAssetTrend 本身）
      expect(sequelize.query).toHaveBeenCalledTimes(4);
      // 單幣 → hasMultiCurrency=false、trend 為陣列
      expect(result.hasMultiCurrency).toBe(false);
      expect(result.trend).toBeInstanceOf(Array);

      // Jan 2023 應在 trend 中（row.getMonth()+1 → month='1'）
      const janRecord = result.trend.find(
        (r: any) => r.year === '2023' && r.month === '1'
      );
      expect(janRecord).toBeDefined();
    });

    it('should return empty trend if no transactions', async () => {
      (sequelize.query as any)
        .mockResolvedValueOnce([{ baseCurrencyCode: 'TWD' }]) // getNetWorth 本位幣
        .mockResolvedValueOnce([]) // getNetWorth 各幣餘額（無帳戶）
        .mockResolvedValueOnce([]); // date range：無交易

      const result = await statisticsServices.getAssetTrend(mockUserId);
      expect(result).toEqual({ trend: [], hasMultiCurrency: false });
    });
  });
});
