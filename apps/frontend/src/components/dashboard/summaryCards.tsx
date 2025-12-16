import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AccountType } from '@repo/shared';
import { Wallet, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';

const summaryCardsData = (values = [0, 0, 0, 0] as number[]) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return [
    {
      title: '總資產',
      value: formatCurrency(values[0]),
      icon: Wallet,
      color: 'text-slate-900 dark:text-slate-50',
      bg: 'bg-slate-100 dark:bg-slate-800',
    },
    {
      title: '本月收入',
      value: formatCurrency(values[1]),
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-100 dark:bg-emerald-900/20',
    },
    {
      title: '本月支出',
      value: formatCurrency(values[2]),
      icon: TrendingDown,
      color: 'text-rose-600',
      bg: 'bg-rose-100 dark:bg-rose-900/20',
    },
    {
      title: '本月損益',
      value: formatCurrency(values[3]),
      icon: PiggyBank,
      color: 'text-indigo-600',
      bg: 'bg-indigo-100 dark:bg-indigo-900/20',
    },
  ];
};

export function SummaryCards({
  accounts,
  summaryData,
}: {
  accounts: AccountType[];
  summaryData: {
    type: string;
    date: string;
    income: number;
    expense: number;
  }[];
}) {
  const calcThisMonthFinances = (
    data: { type: string; date: string; income: number; expense: number }[]
  ) => {
    const now = new Date();
    // Format: YYYY-MM
    const currentKey = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, '0')}`;

    const thisPeriodData = data.find((item) => item.date === currentKey);

    if (thisPeriodData) {
      const profit = thisPeriodData.income - thisPeriodData.expense;
      return [thisPeriodData.income, thisPeriodData.expense, profit];
    }
    return [0, 0, 0];
  };

  const calcTotalAssets = (data: AccountType[]) => {
    const totalAssets = data.reduce(
      (total, item) => total + Number(item.balance),
      0
    );
    return totalAssets;
  };

  const finances = calcThisMonthFinances(summaryData);

  const summary = summaryCardsData([
    calcTotalAssets(accounts),
    finances[0],
    finances[1],
    finances[2],
  ]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {summary.map((item) => (
        <Card key={item.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
            <div className={`p-2 rounded-full ${item.bg}`}>
              <item.icon className={`h-4 w-4 ${item.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
