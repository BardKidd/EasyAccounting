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
          <h2 className="text-3xl font-bold bg-linear-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent font-outfit uppercase tracking-widest drop-shadow-sm">
            儀表板
          </h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            歡迎回來，掌握您的財務狀況
          </p>
        </div>
        <CreateTransactionButton categories={categories} accounts={accounts} />
      </div>

      <SummaryCards accounts={accounts} summaryData={summary.trends} />

      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          <div className="lg:col-span-7">
            <AssetTrendChart data={assetTrend} />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 h-auto">
          <div className="lg:col-span-3">
            <AccountSummaryCard accounts={accounts} />
          </div>
          <div className="lg:col-span-4">
            <RecentTransactions
              transactions={transactions.items}
              categories={categories}
              accounts={accounts}
            />
          </div>
        </div>
      </div>
    </Container>
  );
}
