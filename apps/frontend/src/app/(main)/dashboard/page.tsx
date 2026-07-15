import { Container } from '@/components/ui/container';
import {
  RecentTransactions,
  SummaryCards,
  AssetTrendChart,
  MobileDashboardHero,
  MobileAccountStrip,
} from '@/components/dashboard';
import {
  calcThisMonthFinances,
  calcTotalAssets,
} from '@/components/dashboard/summaryMath';
import { CreateTransactionButton } from '@/components/transactions/createTransactionButton';
import { PeriodType } from '@repo/shared';
import AccountSummaryCard from '@/components/accounts/accountSummaryCard';
import service from '@/services';

export default async function DashboardPage() {
  const now = new Date();
  const firstDayOfMonth = `${now.getFullYear()}-${now.getMonth() + 1}-01`;
  const today = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  const [categories, accounts, transactions, summary, assetTrend] =
    await Promise.all([
      service.getCategories(),
      service.getPersonnelAccounts(),
      service.getTransactions({
        page: 1,
        startDate: firstDayOfMonth,
        endDate: today,
      }),
      service.getTransactionsSummary({
        startDate: `${now.getFullYear()}-01-01`,
        endDate: `${now.getFullYear()}-12-31`,
        groupBy: PeriodType.MONTH,
      }),
      service.getAssetTrend(),
    ]);

  const [monthIncome, monthExpense] = calcThisMonthFinances(summary.trends);

  return (
    // 手機交由外層 LayoutContent 的 p-4 當唯一 16px 溝槽（px-0/py-0 避免雙重內距的 RWD 縮小感）
    <Container className="py-8 max-md:py-0 space-y-8 max-md:space-y-6 max-w-[1600px] px-4 max-md:px-0 md:px-8">
      {/* 桌面標題列；手機由玻璃 Header 顯示頁名，改以總資產 Hero 開場，避免標題重複 */}
      <div className="hidden md:flex items-center justify-between space-y-2">
        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-outfit uppercase tracking-widest">
            儀表板
          </h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            歡迎回來，掌握您的財務狀況
          </p>
        </div>
        {/* 手機以底部中央 FAB 新增交易，這裡桌面才顯示，避免重複入口 */}
        <CreateTransactionButton categories={categories} accounts={accounts} />
      </div>

      <MobileDashboardHero
        totalAssets={calcTotalAssets(accounts)}
        income={monthIncome}
        expense={monthExpense}
      />

      <div className="hidden md:block">
        <SummaryCards accounts={accounts} summaryData={summary.trends} />
      </div>

      <MobileAccountStrip accounts={accounts} />

      {/* 手機順序：Hero → 帳戶橫捲 → 近期交易 → 走勢圖（帳戶卡桌面才顯示）；
          桌面 order 回復圖表滿版列 + 帳戶/近期並排。 */}
      <div className="grid grid-cols-1 gap-6 max-md:gap-5 lg:grid-cols-7">
        <div className="order-2 lg:order-1 lg:col-span-7">
          <AssetTrendChart
            data={assetTrend.trend}
            hasMultiCurrency={assetTrend.hasMultiCurrency}
          />
        </div>
        <div className="order-1 lg:order-3 lg:col-span-4">
          <RecentTransactions
            transactions={transactions.items}
            categories={categories}
            accounts={accounts}
          />
        </div>
        <div className="order-3 max-md:hidden lg:order-2 lg:col-span-3">
          <AccountSummaryCard accounts={accounts} />
        </div>
      </div>
    </Container>
  );
}
