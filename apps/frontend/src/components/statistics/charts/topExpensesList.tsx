'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { ShoppingBag, Coffee, Utensils } from 'lucide-react'; // Example icons
import { formatCurrency } from '@/lib/utils';
import { OverviewTop3ExpensesType } from '@repo/shared';
import { CategoryIcon } from '@/components/ui/category-icon';

export function TopExpensesList({
  items,
}: {
  items: OverviewTop3ExpensesType[];
}) {
  return (
    <Card className="h-full border-0 bg-white/80 dark:bg-slate-900/50 backdrop-blur-md shadow-lg shadow-slate-200/50 dark:shadow-black/10 ring-1 ring-slate-200 dark:ring-white/10 hover:bg-white dark:hover:bg-slate-900/70 transition-all duration-300 group dark:shadow-teal-glow">
      <CardHeader className="border-b border-slate-200 dark:border-white/5 pb-4">
        <CardTitle className="text-lg font-bold font-playfair text-slate-900 dark:text-white">
          單筆支出 Top 3
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item, index) => {
            const rankConfig =
              index === 0
                ? { bg: 'bg-yellow-500', shadow: 'shadow-yellow-500/50' }
                : index === 1
                  ? { bg: 'bg-slate-400', shadow: 'shadow-slate-400/50' }
                  : { bg: 'bg-orange-400', shadow: 'shadow-orange-400/50' };

            return (
              <div
                key={item.id}
                className="group/item flex items-center justify-between p-3 rounded-2xl bg-white/50 dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/10 transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-xs shadow-lg ring-2 ring-white dark:ring-slate-800 ${rankConfig.bg} ${rankConfig.shadow}`}
                  >
                    {index + 1}
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover/item:bg-white dark:group-hover/item:bg-slate-700 text-slate-500 dark:text-slate-400 group-hover/item:text-indigo-500 dark:group-hover/item:text-indigo-400 transition-colors duration-200">
                    <CategoryIcon iconName={item.category.icon} size={18} />
                  </div>

                  <div className="flex flex-col space-y-0.5">
                    <span className="font-bold text-sm text-slate-700 dark:text-slate-200 font-playfair group-hover/item:text-slate-900 dark:group-hover/item:text-white transition-colors">
                      {item.category.name}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      {format(new Date(item.date), 'MM/dd')}
                      {item.description && ` · ${item.description}`}
                    </span>
                  </div>
                </div>

                <div className="font-bold text-rose-500 font-mono text-sm group-hover/item:scale-110 transition-transform duration-200">
                  {formatCurrency(item.amount)}
                </div>
              </div>
            );
          })}
          {items.length === 0 && (
            <div className="text-center text-muted-foreground py-8 flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded"></div>
              </div>
              <span className="text-sm">尚無支出資料</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
