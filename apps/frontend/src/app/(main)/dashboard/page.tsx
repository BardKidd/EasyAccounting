import { Container } from '@/components/ui/container';
import { SummaryCards } from '@/components/dashboard/summary-cards';
import { TrendChart } from '@/components/dashboard/trend-chart';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import NewTransactionSheet from '@/components/transactions/newTransactionSheet';
import AccountSummaryCard from '@/components/accounts/accountSummaryCard';
import service from '@/services';

export default async function DashboardPage() {
  const [categories] = await Promise.all([
    service.getCategories(),
    // service.getPersonnelAccounts(), // Temporarily disabled for mock
  ]);

  // Mock data for visual verification (Same as Accounts Page)
  const accounts: any[] = [
    {
      id: '1',
      name: '錢包',
      type: '現金',
      balance: 2500,
      color: '#10b981', // emerald-500
    },
    {
      id: '2',
      name: '私房錢',
      type: '現金',
      balance: 12000,
      color: '#34d399', // emerald-400
    },
    {
      id: '3',
      name: '中國信託',
      type: '銀行',
      balance: 154000,
      color: '#3b82f6', // blue-500
    },
    {
      id: '4',
      name: '國泰世華',
      type: '銀行',
      balance: 32000,
      color: '#60a5fa', // blue-400
    },
    {
      id: '5',
      name: '玉山銀行',
      type: '銀行',
      balance: 45000,
      color: '#93c5fd', // blue-300
    },
    {
      id: '6',
      name: '中信 LinePay 卡',
      type: '信用卡',
      balance: -5400,
      color: '#f43f5e', // rose-500
    },
    {
      id: '7',
      name: 'Costco 聯名卡',
      type: '信用卡',
      balance: -12000,
      color: '#fb7185', // rose-400
    },
    {
      id: '8',
      name: '富邦證券',
      type: '證券戶',
      balance: 560000,
      color: '#eab308', // yellow-500
    },
    {
      id: '9',
      name: '借給朋友',
      type: '其他',
      balance: 5000,
      color: '#a855f7', // purple-500
    },
  ];

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
