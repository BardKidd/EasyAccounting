import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AccountType } from '@repo/shared';
import { Wallet, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const summaryCardsData = (values = [0, 0, 0, 0] as number[]) => {
  return [
    {
      title: '總資產',
      value: formatCurrency(values[0]),
      icon: Wallet,
      color: 'text-teal-400 drop-shadow-[0_0_8px_rgba(45,212,191,0.5)]',
      bg: 'bg-teal-500/10',
    },
    {
      title: '本月收入',
      value: formatCurrency(values[1]),
      icon: TrendingUp,
      color: 'text-teal-400 drop-shadow-[0_0_8px_rgba(45,212,191,0.5)]',
      bg: 'bg-teal-500/10',
    },
    {
      title: '本月支出',
      value: formatCurrency(values[2]),
      icon: TrendingDown,
      color: 'text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.5)]',
      bg: 'bg-rose-500/10',
    },
    {
      title: '本月損益',
      value: formatCurrency(values[3]),
      icon: PiggyBank,
      color: 'text-teal-400 drop-shadow-[0_0_8px_rgba(45,212,191,0.5)]',
      bg: 'bg-teal-500/10',
    },
  ];
};

function SummaryCards({
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
    data: { type: string; date: string; income: number; expense: number }[],
  ) => {
    const now = new Date();
    // Format: YYYY-MM
    const currentKey = `${now.getFullYear()}-${String(
      now.getMonth() + 1,
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
      0,
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
        <Card
          key={item.title}
          className="border-border bg-card shadow-sm hover:shadow-md transition-all duration-300 group hover:border-primary/50"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              {item.title}
            </CardTitle>
            <div
              className={`p-2 rounded-xl transition-all duration-300 group-hover:scale-110 ${item.bg.replace('bg-', 'bg-opacity-20 ')}`}
            >
              <item.icon className={`h-4 w-4 ${item.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground tracking-wide">
              {item.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default SummaryCards;
