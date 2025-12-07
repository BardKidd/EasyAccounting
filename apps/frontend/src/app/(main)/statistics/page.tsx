import { Container } from '@/components/ui/container';
import { ExpensePieChart, TrendChart } from '@/components/statistics/charts';
import service from '@/services';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export default async function StatisticsPage() {
  // Default range: Last 6 months
  const now = new Date();
  const startDate = format(startOfMonth(subMonths(now, 5)), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(now), 'yyyy-MM-dd');

  // Fetch all transactions in range (no pagination limits for charts ideally)
  // Our service might have default limit. Let's pass a large limit.

  //transactions,
  const [categories] = await Promise.all([
    // service.getTransactions({
    //   startDate,
    //   endDate,
    //   limit: 1000,
    // }),
    service.getCategories(),
  ]);

  return (
    <Container className="py-8 space-y-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">統計報表</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="col-span-2">
          {/* <TrendChart transactions={transactions} /> */}
        </div>
        <div className="col-span-1">
          {/* <ExpensePieChart
            transactions={transactions}
            categories={categories}
          /> */}
        </div>
        {/* Can add Income Pie Chart or other metrics here */}
      </div>
    </Container>
  );
}
