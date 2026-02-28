'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, calculateNetAmount } from '@/lib/utils';
import { CategoryIcon } from '@/components/ui/category-icon';
import { DetailsTransaction, RootType } from '@repo/shared';

interface DailyTransactionListProps {
  transactions: DetailsTransaction[];
}

export function DailyTransactionList({
  transactions,
}: DailyTransactionListProps) {
  const getAmountStyle = (item: DetailsTransaction) => {
    const netAmount = calculateNetAmount(item);
    if (item.targetAccountName) {
      return { color: 'text-amber-500', prefix: '', amount: netAmount };
    }

    if (netAmount === 0) {
      return {
        color: 'text-teal-600 dark:text-teal-400',
        prefix: '',
        amount: netAmount,
      };
    }

    if (item.type === RootType.INCOME)
      return {
        color: 'text-teal-600 dark:text-teal-400',
        prefix: '+',
        amount: netAmount,
      };
    if (item.type === RootType.EXPENSE)
      return {
        color: 'text-rose-600 dark:text-rose-400',
        prefix: '-',
        amount: netAmount,
      };

    return {
      color: 'text-slate-600 dark:text-slate-400',
      prefix: '',
      amount: netAmount,
    };
  };

  return (
    <Card className="border-slate-200/50 dark:border-white/10 bg-white/60 dark:bg-[#0f172a]/60 backdrop-blur-2xl rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden group">
      <CardHeader className="pb-2 border-b border-slate-200/50 dark:border-white/10 bg-white/40 dark:bg-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-r from-emerald-500/0 via-emerald-500/5 to-teal-500/0 dark:from-emerald-400/0 dark:via-emerald-400/5 dark:to-teal-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
        <CardTitle className="text-xl font-bold font-playfair text-slate-900 dark:text-white relative z-10 transition-colors duration-300 group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
          明細列表
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {transactions.map((item) => {
            const { color, prefix, amount } = getAmountStyle(item);

            return (
              <div
                key={item.id}
                className="flex items-center p-4 rounded-2xl bg-white/50 dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/10 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-emerald-200 dark:hover:border-emerald-500/30 cursor-pointer group/item"
              >
                {/* Icon */}
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl shadow-sm transition-transform group-hover/item:scale-110 duration-300"
                  style={{
                    backgroundColor: `${item.categoryColor}20`,
                  }}
                >
                  <CategoryIcon
                    iconName={item.categoryIcon}
                    className="h-5 w-5"
                    style={{ color: item.categoryColor }}
                  />
                </div>

                {/* Description & Date */}
                <div className="ml-4 space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      {item.categoryName}{' '}
                      <span className="text-slate-400 font-normal text-xs ml-2">
                        {item.description}
                      </span>
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 font-mono">
                    {item.accountName}{' '}
                    {item.targetAccountName && `→ ${item.targetAccountName}`} •{' '}
                    {item.date}
                  </p>
                </div>

                {/* Amount */}
                <div className={`ml-auto font-bold font-mono text-sm ${color}`}>
                  {prefix}
                  {formatCurrency(Math.abs(amount))}
                </div>
              </div>
            );
          })}
          {transactions.length === 0 && (
            <div className="text-center py-12 text-slate-400 flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded"></div>
              </div>
              <span>尚無交易資料</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
