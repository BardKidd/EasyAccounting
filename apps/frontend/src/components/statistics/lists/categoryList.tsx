'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { CategoryIcon } from '@/components/ui/category-icon';
import { StatisticsType, STATISTICS_CONFIG } from '../constants';
import { CategoryTabDataType } from '@repo/shared';
import { useEffect } from 'react';

interface CategoryListProps {
  items: CategoryTabDataType[];
  totalAmount: number;
  type: string;
}

export function CategoryList({ items, totalAmount, type }: CategoryListProps) {
  const getColor = (type: string) => {
    if (Object.values(StatisticsType).includes(type as StatisticsType)) {
      return STATISTICS_CONFIG[type as StatisticsType].tailwindColor;
    }
    return 'text-foreground';
  };

  const amountColor = getColor(type);

  useEffect(() => {
    console.log(items);
  }, [items]);

  return (
    <Card className="border-slate-200/50 dark:border-white/10 bg-white/60 dark:bg-[#0f172a]/60 backdrop-blur-2xl rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden group">
      <CardHeader className="pb-2 border-b border-slate-200/50 dark:border-white/10 bg-white/40 dark:bg-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-r from-emerald-500/0 via-emerald-500/5 to-teal-500/0 dark:from-emerald-400/0 dark:via-emerald-400/5 dark:to-teal-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
        <CardTitle className="text-xl font-bold font-playfair text-slate-900 dark:text-white relative z-10 transition-colors duration-300 group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
          類別列表
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-0 divide-y divide-slate-100 dark:divide-white/5">
          {/* List Items */}
          <div className="max-h-[400px] overflow-y-auto px-6 py-4 space-y-3 custom-scrollbar">
            {items.map((item) => {
              return (
                <div
                  key={`${item.id}-${item.name}`}
                  className="flex items-center p-3 rounded-2xl bg-white/50 dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/10 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-emerald-200 dark:hover:border-emerald-500/30 cursor-pointer group/item"
                >
                  {/* Icon */}
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl shadow-sm transition-transform group-hover/item:scale-110 duration-300"
                    style={{
                      backgroundColor: `${item.color}20`,
                    }}
                  >
                    <CategoryIcon
                      iconName={item.icon}
                      className="h-5 w-5"
                      style={{ color: item.color }}
                    />
                  </div>

                  {/* Name & Count */}
                  <div className="ml-4 flex-1 space-y-0.5">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      {item.name}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {item.count} 筆交易
                    </p>
                  </div>

                  {/* Amount */}
                  <div
                    className={`ml-auto font-bold font-mono text-sm ${amountColor}`}
                  >
                    {formatCurrency(item.amount)}
                  </div>
                </div>
              );
            })}
            {items.length === 0 && (
              <div className="text-center py-10 text-slate-400">尚無資料</div>
            )}
          </div>

          {/* Footer - Total */}
          <div className="bg-slate-50/50 dark:bg-slate-800/50 px-6 py-4 flex items-center justify-between border-t border-slate-200 dark:border-white/5 backdrop-blur-sm rounded-b-xl">
            <span className="font-bold text-slate-600 dark:text-slate-300 font-playfair">
              總計
            </span>
            <span className={`text-lg font-bold font-mono ${amountColor}`}>
              {formatCurrency(totalAmount)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
