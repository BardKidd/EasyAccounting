import { Container } from '@/components/ui/container';
import { SummaryCards } from '@/components/dashboard/summary-cards';
import { TrendChart } from '@/components/dashboard/trend-chart';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { NewTransactionSheet } from '@/components/transactions/new-transaction-sheet';
import InitCategoryStore from '@/components/init-stores/init-category-store';
import service from '@/services';

export default async function DashboardPage() {
  const categories = await service.getCategories();

  return (
    <Container className="py-8 space-y-8">
      <InitCategoryStore categories={categories} />
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">儀表板</h2>
        <NewTransactionSheet />
      </div>

      <SummaryCards />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <TrendChart />
        <RecentTransactions />
      </div>
    </Container>
  );
}
