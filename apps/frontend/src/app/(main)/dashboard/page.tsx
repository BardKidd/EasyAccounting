import { Container } from '@/components/ui/container';
import {
  RecentTransactions,
  SummaryCards,
  AssetTrendChart,
} from '@/components/dashboard';
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

  return (
    <Container className="py-8 space-y-8 max-w-[1600px] px-4 md:px-8">
      <div className="flex items-center justify-between space-y-2">
        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-outfit uppercase tracking-widest">
            儀表板
          </h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            歡迎回來，掌握您的財務狀況
          </p>
        </div>
        {/* 手機以底部中央 FAB 新增交易，這裡桌面才顯示，避免重複入口 */}
        <div className="hidden md:block">
          <CreateTransactionButton categories={categories} accounts={accounts} />
        </div>
      </div>

      <SummaryCards accounts={accounts} summaryData={summary.trends} />

      {/* 手機順序：近期交易 → 走勢圖 → 帳戶（把「複查交易」這個核心工作擺第一）；
          桌面 order 回復圖表滿版列 + 帳戶/近期並排。 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-7">
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
        <div className="order-3 lg:order-2 lg:col-span-3">
          <AccountSummaryCard accounts={accounts} />
        </div>
      </div>
    </Container>
  );
}
