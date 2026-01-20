'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { getIcon } from '@/lib/icon-mapping';
import { RootType, RankingTabDataType } from '@repo/shared';

interface RankingListProps {
  transactions: RankingTabDataType[];
}

export function RankingList({ transactions }: RankingListProps) {
  const getAmountStyle = (item: RankingTabDataType) => {
    if (item.isTransfer) {
      return { color: 'text-orange-500', prefix: '' };
    }
    if (item.type === RootType.INCOME)
      return { color: 'text-green-600', prefix: '+' };
    if (item.type === RootType.EXPENSE)
      return { color: 'text-red-600', prefix: '-' };
    return { color: 'text-gray-600', prefix: '' };
  };

  return (
    <Card className="border-0 bg-white/80 dark:bg-slate-900/50 backdrop-blur-md shadow-lg shadow-slate-200/50 dark:shadow-black/10 ring-1 ring-slate-200 dark:ring-white/10 hover:bg-white dark:hover:bg-slate-900/70 transition-all duration-300 group">
      <CardHeader className="border-b border-slate-200 dark:border-white/5 pb-4">
        <CardTitle className="text-xl font-bold font-playfair text-slate-900 dark:text-white">
          排行列表
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[600px] overflow-y-auto px-6 py-4 space-y-3 custom-scrollbar">
          {transactions.map((item, index) => {
            const { color, prefix } = getAmountStyle(item);
            const IconComponent = getIcon(item.categoryIcon);

            return (
              <div
                key={item.id}
                className="flex items-center p-3 rounded-2xl bg-white/50 dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/10 transition-all duration-200 hover:shadow-md cursor-pointer group/item"
              >
                {/* Rank (Optional, implicit by order) or Icon */}
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0 shadow-sm transition-transform group-hover/item:scale-110 duration-300"
                  style={{
                    backgroundColor: `${item.categoryColor}20`,
                  }}
                >
                  <IconComponent
                    className="h-5 w-5"
                    style={{ color: item.categoryColor }}
                  />
                </div>

                {/* Middle: Category & Description */}
                <div className="ml-4 flex-1 min-w-0 space-y-0.5">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
                    {item.categoryName} {index + 1}.
                    <span className="text-slate-400 font-normal text-xs ml-2">
                      {item.description}
                    </span>
                  </p>
                </div>

                {/* Right: Amount & Account */}
                <div className="ml-4 text-right shrink-0 space-y-0.5">
                  <div className={`text-sm font-bold font-mono ${color}`}>
                    {prefix}
                    {formatCurrency(item.amount)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {item.accountName}
                  </div>
                </div>
              </div>
            );
          })}
          {transactions.length === 0 && (
            <div className="text-center py-10 text-slate-400 flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded"></div>
              </div>
              <span>尚無資料</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
