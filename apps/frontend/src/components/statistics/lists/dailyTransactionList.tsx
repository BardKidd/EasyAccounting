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
      return { color: 'text-orange-500', prefix: '', amount: netAmount };
    }

    if (netAmount === 0) {
      return { color: 'text-emerald-500', prefix: '', amount: netAmount };
    }

    if (item.type === RootType.INCOME)
      return { color: 'text-green-600', prefix: '+', amount: netAmount };
    if (item.type === RootType.EXPENSE)
      return { color: 'text-red-600', prefix: '-', amount: netAmount };

    return { color: 'text-gray-600', prefix: '', amount: netAmount };
  };

  return (
    <Card className="border-0 bg-white/80 dark:bg-slate-900/50 backdrop-blur-md shadow-lg shadow-slate-200/50 dark:shadow-black/10 ring-1 ring-slate-200 dark:ring-white/10 hover:bg-white dark:hover:bg-slate-900/70 transition-all duration-300 group">
      <CardHeader className="border-b border-slate-200 dark:border-white/5 pb-4">
        <CardTitle className="text-xl font-bold font-playfair text-slate-900 dark:text-white">
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
                className="flex items-center p-4 rounded-2xl bg-white/50 dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/10 transition-all duration-200 hover:shadow-md cursor-pointer group/item"
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
