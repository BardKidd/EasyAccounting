import { formatCurrency, cn } from '@/lib/utils';

/**
 * 手機版儀表板開場：總資產直接落在畫布上（非卡片），
 * 下方一條三格的本月收支摘要。取代桌面的 2x2 SummaryCards。
 */
function MobileDashboardHero({
  totalAssets,
  income,
  expense,
}: {
  totalAssets: number;
  income: number;
  expense: number;
}) {
  const profit = income - expense;

  const stats = [
    {
      label: '本月收入',
      value: income,
      prefix: income > 0 ? '+' : '',
      className: 'text-teal-600 dark:text-teal-400',
    },
    {
      label: '本月支出',
      value: expense,
      prefix: expense > 0 ? '-' : '',
      className:
        expense > 0
          ? 'text-rose-600 dark:text-rose-400'
          : 'text-slate-700 dark:text-slate-200',
    },
    {
      label: '本月損益',
      value: Math.abs(profit),
      prefix: profit > 0 ? '+' : profit < 0 ? '-' : '',
      className:
        profit > 0
          ? 'text-emerald-600 dark:text-emerald-400'
          : profit < 0
            ? 'text-rose-600 dark:text-rose-400'
            : 'text-slate-700 dark:text-slate-200',
    },
  ];

  return (
    <section aria-label="資產總覽" className="md:hidden">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
        總資產
      </p>
      <p className="mt-1 font-outfit text-4xl font-bold leading-tight tracking-tight text-slate-900 dark:text-white tabular-nums">
        {formatCurrency(totalAssets)}
      </p>

      <div className="mt-4 grid grid-cols-3 divide-x divide-slate-200/70 dark:divide-white/10 rounded-2xl border border-slate-200 dark:border-slate-800 bg-card dark:bg-slate-800 shadow-sm">
        {stats.map((stat) => (
          <div key={stat.label} className="px-2 py-3 text-center">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {stat.label}
            </p>
            <p
              className={cn(
                'mt-1 truncate font-outfit text-sm font-bold tabular-nums',
                stat.className,
              )}
            >
              {stat.prefix}
              {formatCurrency(stat.value)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default MobileDashboardHero;
