import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AccountType } from '@repo/shared';
import { Wallet, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import {
  calcThisMonthFinances,
  calcTotalAssets,
  MonthlySummaryPoint,
} from './summaryMath';

const summaryCardsData = (values = [0, 0, 0, 0] as number[]) => {
  return [
    {
      title: '總資產',
      value: formatCurrency(values[0]),
      rawValue: values[0],
      icon: Wallet,
      color:
        'text-teal-600 dark:text-teal-400 drop-shadow-sm dark:drop-shadow-[0_0_8px_rgba(45,212,191,0.5)]',
      bg: 'bg-teal-50 dark:bg-teal-500/10',
    },
    {
      title: '本月收入',
      value: formatCurrency(values[1]),
      rawValue: values[1],
      icon: TrendingUp,
      color:
        'text-teal-600 dark:text-teal-400 drop-shadow-sm dark:drop-shadow-[0_0_8px_rgba(45,212,191,0.5)]',
      bg: 'bg-teal-50 dark:bg-teal-500/10',
    },
    {
      title: '本月支出',
      value: formatCurrency(values[2]),
      rawValue: values[2],
      icon: TrendingDown,
      color:
        'text-rose-600 dark:text-rose-400 drop-shadow-sm dark:drop-shadow-[0_0_8px_rgba(251,113,133,0.5)]',
      bg: 'bg-rose-50 dark:bg-rose-500/10',
    },
    {
      title: '本月損益',
      value: formatCurrency(values[3]),
      rawValue: values[3],
      icon: PiggyBank,
      color:
        'text-teal-600 dark:text-teal-400 drop-shadow-sm dark:drop-shadow-[0_0_8px_rgba(45,212,191,0.5)]',
      bg: 'bg-teal-50 dark:bg-teal-500/10',
    },
  ];
};

function SummaryCards({
  accounts,
  summaryData,
}: {
  accounts: AccountType[];
  summaryData: MonthlySummaryPoint[];
}) {
  const finances = calcThisMonthFinances(summaryData);

  const summary = summaryCardsData([
    calcTotalAssets(accounts),
    finances[0],
    finances[1],
    finances[2],
  ]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {summary.map((item, index) => (
        <Card
          key={item.title}
          className={cn(
            // 內容卡片：實心 bg-card（非玻璃）；玻璃只留給 chrome（DESIGN.md）。移除 backdrop-blur 也解 iOS 捲動卡頓。
            'border border-slate-200 dark:border-slate-800 bg-card shadow-sm transition-all duration-300 group hover:-translate-y-1 hover:shadow-md overflow-hidden relative',
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
              {item.title}
            </CardTitle>
            <div
              className={`p-2 rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 ${item.bg.replace('bg-', 'bg-opacity-20 ')} ring-1 ring-black/5 dark:ring-white/10 shadow-inner`}
            >
              <item.icon className={`h-4 w-4 ${item.color}`} />
            </div>
          </CardHeader>
          <CardContent className="relative z-10 pt-4">
            <div
              className={cn(
                'text-2xl sm:text-3xl font-bold font-outfit tracking-tight transition-colors duration-300',
                item.title === '本月支出' && item.rawValue > 0
                  ? 'text-rose-500 dark:text-rose-400'
                  : item.title === '本月損益'
                    ? item.rawValue > 0
                      ? 'text-emerald-500 dark:text-emerald-400'
                      : item.rawValue < 0
                        ? 'text-rose-500 dark:text-rose-400'
                        : 'text-slate-800 dark:text-white'
                    : 'text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400',
              )}
            >
              {item.value}
            </div>
            <div
              className={cn(
                'w-12 h-1 mt-4 rounded-full transition-all duration-300 group-hover:w-full',
                item.title === '本月支出'
                  ? 'bg-rose-200 dark:bg-rose-900/50 group-hover:bg-linear-to-r group-hover:from-rose-500 group-hover:to-pink-400'
                  : item.title === '本月損益' && item.rawValue < 0
                    ? 'bg-rose-200 dark:bg-rose-900/50 group-hover:bg-linear-to-r group-hover:from-rose-500 group-hover:to-pink-400'
                    : 'bg-slate-200 dark:bg-slate-800 group-hover:bg-linear-to-r group-hover:from-emerald-500 group-hover:to-teal-400',
              )}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default SummaryCards;
