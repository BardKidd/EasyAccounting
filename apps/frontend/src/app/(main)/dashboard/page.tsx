import { Container } from '@/components/ui/container';
import { SummaryCards } from '@/components/dashboard/summaryCards';
import { TrendChart } from '@/components/dashboard/trendChart';
import { RecentTransactions } from '@/components/dashboard/recentTransactions';
import NewTransactionSheet from '@/components/transactions/newTransactionSheet';
import AccountSummaryCard from '@/components/accounts/accountSummaryCard';
import service from '@/services';

export default async function DashboardPage() {
  const [categories, accounts] = await Promise.all([
    service.getCategories(),
    service.getPersonnelAccounts(),
  ]);

  return (
    <Container className="py-8 space-y-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">儀表板</h2>
        <NewTransactionSheet categories={categories} />
      </div>

      <SummaryCards />

      <div className="space-y-4">
        <TrendChart />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <div className="lg:col-span-3 h-[500px]">
            <AccountSummaryCard accounts={accounts} />
          </div>
          <div className="lg:col-span-4 h-[500px]">
            <RecentTransactions />
          </div>
        </div>
      </div>
    </Container>
  );
}
