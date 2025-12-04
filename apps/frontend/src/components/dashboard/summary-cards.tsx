import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';

const summaryData = [
  {
    title: '總資產',
    value: '$0',
    description: '尚無資料',
    icon: Wallet,
    color: 'text-slate-900 dark:text-slate-50',
    bg: 'bg-slate-100 dark:bg-slate-800',
  },
  {
    title: '本月收入',
    value: '$0',
    description: '尚無資料',
    icon: TrendingUp,
    color: 'text-emerald-600',
    bg: 'bg-emerald-100 dark:bg-emerald-900/20',
  },
  {
    title: '本月支出',
    value: '$0',
    description: '尚無資料',
    icon: TrendingDown,
    color: 'text-rose-600',
    bg: 'bg-rose-100 dark:bg-rose-900/20',
  },
  {
    title: '預算剩餘',
    value: '$0',
    description: '尚無資料',
    icon: PiggyBank,
    color: 'text-indigo-600',
    bg: 'bg-indigo-100 dark:bg-indigo-900/20',
  },
];

export function SummaryCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {summaryData.map((item) => (
        <Card key={item.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
            <div className={`p-2 rounded-full ${item.bg}`}>
              <item.icon className={`h-4 w-4 ${item.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.value}</div>
            <p className="text-xs text-muted-foreground">{item.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
