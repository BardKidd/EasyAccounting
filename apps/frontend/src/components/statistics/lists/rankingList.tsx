'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { CategoryIcon } from '@/components/ui/category-icon';
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
    <Card className="border-slate-200/50 dark:border-white/10 bg-white/60 dark:bg-[#0f172a]/60 backdrop-blur-2xl rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden group">
      <CardHeader className="pb-2 border-b border-slate-200/50 dark:border-white/10 bg-white/40 dark:bg-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-r from-emerald-500/0 via-emerald-500/5 to-teal-500/0 dark:from-emerald-400/0 dark:via-emerald-400/5 dark:to-teal-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
        <CardTitle className="text-xl font-bold font-outfit text-slate-900 dark:text-white relative z-10 transition-colors duration-300 group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
          排行列表
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[600px] overflow-y-auto px-6 py-4 space-y-3 custom-scrollbar">
          {transactions.map((item, index) => {
            const { color, prefix } = getAmountStyle(item);

            return (
              <div
                key={item.id}
                className="flex items-center p-3 rounded-2xl bg-white/50 dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/10 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-emerald-200 dark:hover:border-emerald-500/30 cursor-pointer group/item"
              >
                {/* Rank (Optional, implicit by order) or Icon */}
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0 shadow-sm transition-transform group-hover/item:scale-110 duration-300"
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
