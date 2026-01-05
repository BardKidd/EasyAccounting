import { Container } from '@/components/ui/container';
import {
  RecentTransactions,
  SummaryCards,
  AssetTrendChart,
} from '@/components/dashboard';
import NewTransactionSheet from '@/components/transactions/newTransactionSheet';
import { PeriodType } from '@repo/shared';
import AccountSummaryCard from '@/components/accounts/accountSummaryCard';
import service from '@/services';

export default async function DashboardPage() {
  const now = new Date();
  const [categories, accounts, transactions, summary, assetTrend] =
    await Promise.all([
      service.getCategories(),
      service.getPersonnelAccounts(),
      service.getTransactions({ page: 1 }),
      service.getTransactionsSummary({
        startDate: `${now.getFullYear()}-01-01`,
        endDate: `${now.getFullYear()}-12-31`,
        groupBy: PeriodType.MONTH,
      }),
      service.getAssetTrend(),
    ]);

  return (
    <Container className="py-8 space-y-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">儀表板</h2>
        <NewTransactionSheet categories={categories} accounts={accounts} />
      </div>

      <SummaryCards accounts={accounts} summaryData={summary.trends} />

      <div className="space-y-4">
        <AssetTrendChart data={assetTrend} />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <div className="lg:col-span-3 h-[500px]">
            <AccountSummaryCard accounts={accounts} />
          </div>
          <div className="lg:col-span-4 h-[500px]">
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
