import statisticsServices from '@/services/statisticsServices';
import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { ComparisonCategory } from '@/emails/monthlyAnalysis';
import { CategoryTabDataType, RootType } from '@repo/shared';
import { formatMonthLabel } from '@/utils/format';

interface MonthlyReportServiceProps {
  userName: string;
  userEmail: string;
  userId: string;
}
const monthlyReportService = async ({
  userName,
  userEmail,
  userId,
}: MonthlyReportServiceProps) => {
  const now = new Date();
  const lastMonth = subMonths(now, 1);
  const lastMonthPeriod = [startOfMonth(lastMonth), endOfMonth(lastMonth)];
  const monthBeforeLastMonth = subMonths(now, 2);
  const monthBeforeLastMonthPeriod = [
    startOfMonth(monthBeforeLastMonth),
    endOfMonth(monthBeforeLastMonth),
  ];

  //! m1 代表上個月
  //! m2 代表上上個月
  const m1OverviewData = await statisticsServices.getOverviewTrend(
    {
      startDate: format(lastMonthPeriod[0] as Date, 'yyyy-MM-dd'),
      endDate: format(lastMonthPeriod[1] as Date, 'yyyy-MM-dd'),
    },
    userId
  );
  const m2OverviewData = await statisticsServices.getOverviewTrend(
    {
      startDate: format(monthBeforeLastMonthPeriod[0] as Date, 'yyyy-MM-dd'),
      endDate: format(monthBeforeLastMonthPeriod[1] as Date, 'yyyy-MM-dd'),
    },
    userId
  );
  const m1DetailData = await statisticsServices.getDetailTabData(
    {
      startDate: format(lastMonthPeriod[0] as Date, 'yyyy-MM-dd'),
      endDate: format(lastMonthPeriod[1] as Date, 'yyyy-MM-dd'),
    },
    userId
  );
  const m1DetailExpenseData =
    m1DetailData.filter(
      (item) => item.type === RootType.EXPENSE && !item.isTransfer
    ) || [];

  const m1Top3Expenses = await statisticsServices.getOverviewTop3Categories(
    {
      startDate: format(lastMonthPeriod[0] as Date, 'yyyy-MM-dd'),
      endDate: format(lastMonthPeriod[1] as Date, 'yyyy-MM-dd'),
    },
    userId
  );

  const m1CategoriesData = await statisticsServices.getCategoryTabData(
    {
      startDate: format(lastMonthPeriod[0] as Date, 'yyyy-MM-dd'),
      endDate: format(lastMonthPeriod[1] as Date, 'yyyy-MM-dd'),
    },
    userId
  );
  const m2CategoriesData = await statisticsServices.getCategoryTabData(
    {
      startDate: format(monthBeforeLastMonthPeriod[0] as Date, 'yyyy-MM-dd'),
      endDate: format(monthBeforeLastMonthPeriod[1] as Date, 'yyyy-MM-dd'),
    },
    userId
  );

  const m1IncomeCategoriesData =
    m1CategoriesData.filter(
      (item) => item.type === RootType.INCOME && !item.isTransfer
    ) || [];
  const m2IncomeCategoriesData =
    m2CategoriesData.filter(
      (item) => item.type === RootType.INCOME && !item.isTransfer
    ) || [];
  const m1ExpenseCategoriesData =
    m1CategoriesData.filter(
      (item) => item.type === RootType.EXPENSE && !item.isTransfer
    ) || [];
  const m2ExpenseCategoriesData =
    m2CategoriesData.filter(
      (item) => item.type === RootType.EXPENSE && !item.isTransfer
    ) || [];

  const setM2IncomeCategoryId = new Set(
    m2IncomeCategoriesData.map((item) => item.id)
  );
  const setM2ExpenseCategoryId = new Set(
    m2ExpenseCategoriesData.map((item) => item.id)
  );
  // 找尋新的類別(差集)
  const filterDiffM1IncomeCategoriesData = m1IncomeCategoriesData.filter(
    (item) => !setM2IncomeCategoryId.has(item.id)
  );
  const filterDiffM1ExpenseCategoriesData = m1ExpenseCategoriesData.filter(
    (item) => !setM2ExpenseCategoryId.has(item.id)
  );

  // 找尋收支增長最多的依照金額排序(最多選三個)
  // 先找交集
  const filterInterM1IncomeCategoriesData = m1IncomeCategoriesData
    .filter((item) => setM2IncomeCategoryId.has(item.id))
    .slice(0, 3);
  const filterInterM1ExpenseCategoriesData = m1ExpenseCategoriesData
    .filter((item) => setM2ExpenseCategoryId.has(item.id))
    .slice(0, 3);
  // 整理格式
  // formula: ((m1 - m2) / m2) * 100
  const incomeComparison = filterInterM1IncomeCategoriesData.map((item) => {
    const m2MatchedItem = m2IncomeCategoriesData.find(
      (i) => i.id === item.id
    ) as CategoryTabDataType;
    return {
      name: item.name,
      amount: item.amount,
      percentageChange:
        (
          ((Number(item.amount) - Number(m2MatchedItem.amount)) /
            Number(m2MatchedItem.amount)) *
          100
        ).toFixed(2) || '0',
    };
  });
  const expenseComparison = filterInterM1ExpenseCategoriesData.map((item) => {
    const m2MatchedItem = m2ExpenseCategoriesData.find(
      (i) => i.id === item.id
    ) as CategoryTabDataType;
    return {
      name: item.name,
      amount: item.amount,
      percentageChange:
        (
          ((Number(item.amount) - Number(m2MatchedItem.amount)) /
            Number(m2MatchedItem.amount)) *
          100
        ).toFixed(2) || '0',
    };
  });

  const mappingMonthStringLabel = [
    formatMonthLabel(
      Number(format(monthBeforeLastMonthPeriod[0] as Date, 'MM'))
    ),
    formatMonthLabel(Number(format(lastMonthPeriod[0] as Date, 'MM'))),
  ] as string[]; // [上上個月, 上個月]

  // 最後要送進去 emailService 的那包，對應 monthlyAnalysis 的所有 interface
  const payload = {
    to: userEmail,
    userName,
    yearString: format(lastMonthPeriod[0] as Date, 'yyyy'),
    twoMonths: mappingMonthStringLabel,
    summary: {
      income: m1OverviewData?.income || 0,
      expense: m1OverviewData?.expense || 0,
      balance: m1OverviewData?.balance || 0,
    },
    balanceTrend: {
      lastLastMonthBalance: Number(m2OverviewData?.balance) || 0,
      lastMonthBalance: Number(m1OverviewData?.balance) || 0,
      totalChangeAmount:
        Number(m1OverviewData?.balance) - Number(m2OverviewData?.balance) || 0,
      totalChangePercent:
        (
          ((Number(m1OverviewData?.balance) - Number(m2OverviewData?.balance)) /
            Number(m2OverviewData?.balance)) *
          100
        ).toFixed(2) || '0',
    },
    topExpenses: {
      labels:
        (m1Top3Expenses.map((item) => item.category.name) as string[]) || [],
      data: (m1Top3Expenses.map((item) => item.amount) as string[]) || [],
      colors:
        (m1Top3Expenses.map((item) => item.category.color) as string[]) || [],
      maxTransaction: {
        title:
          m1DetailExpenseData?.length > 0
            ? (m1DetailExpenseData[0]?.category?.name as string)
            : '無',
        amount:
          m1DetailExpenseData?.length > 0
            ? (m1DetailExpenseData[0]?.amount as string)
            : '0',
        date:
          m1DetailExpenseData?.length > 0
            ? format(m1DetailExpenseData[0]?.date, 'yyyy/MM/dd')
            : '',
      },
    },
    expenseComparison: {
      newCategories:
        (filterDiffM1ExpenseCategoriesData.map(
          (item) => item.name
        ) as string[]) || [],
      increasedCategories: expenseComparison as ComparisonCategory[],
    },
    incomeComparison: {
      newCategories:
        (filterDiffM1IncomeCategoriesData.map(
          (item) => item.name
        ) as string[]) || [],
      increasedCategories: incomeComparison as ComparisonCategory[],
    },
  };

  return payload;
};

export default {
  monthlyReportService,
};
