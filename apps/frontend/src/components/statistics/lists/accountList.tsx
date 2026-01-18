'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { getIcon } from '@/lib/icon-mapping';
import { StatisticsType, STATISTICS_CONFIG } from '../constants';
import { AccountTabDataType, RootType } from '@repo/shared';

interface AccountListProps {
  items: AccountTabDataType[];
  totalAmount: number;
  type: string;
}

export function AccountList({ items, totalAmount, type }: AccountListProps) {
  const getColor = (type: string) => {
    if (Object.values(StatisticsType).includes(type as StatisticsType)) {
      return STATISTICS_CONFIG[type as StatisticsType].tailwindColor;
    }
    return 'text-foreground';
  };

  const amountColor = getColor(type);

  return (
    <Card className="border-0 bg-white/80 dark:bg-slate-900/50 backdrop-blur-md shadow-lg shadow-slate-200/50 dark:shadow-black/10 ring-1 ring-slate-200 dark:ring-white/10 hover:bg-white dark:hover:bg-slate-900/70 transition-all duration-300 group">
      <CardHeader className="border-b border-slate-200 dark:border-white/5 pb-4">
        <CardTitle className="text-xl font-bold font-playfair text-slate-900 dark:text-white">
          帳戶列表
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-0 divide-y divide-slate-100 dark:divide-white/5">
          {/* List Items */}
          <div className="max-h-[400px] overflow-y-auto px-6 py-4 space-y-3 custom-scrollbar">
            {items.map((item) => {
              const IconComponent = getIcon(item.icon) || getIcon('Wallet');
              return (
                <div
                  key={`${item.id}${item.type}${item.isTransfer}`}
                  className="flex items-center p-3 rounded-2xl bg-white/50 dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/10 transition-all duration-200 hover:shadow-md cursor-pointer group/item"
                >
                  {/* Icon */}
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl shadow-sm transition-transform group-hover/item:scale-110 duration-300"
                    style={{
                      backgroundColor: `${item.color}20`,
                    }}
                  >
                    <IconComponent
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
                    className={`ml-auto font-bold font-mono text-sm ${
                      item.isTransfer
                        ? item.type === RootType.INCOME
                          ? STATISTICS_CONFIG[StatisticsType.TRANSFER_IN]
                              .tailwindColor
                          : STATISTICS_CONFIG[StatisticsType.TRANSFER_OUT]
                              .tailwindColor
                        : item.type === RootType.INCOME
                          ? STATISTICS_CONFIG[StatisticsType.INCOME]
                              .tailwindColor
                          : STATISTICS_CONFIG[StatisticsType.EXPENSE]
                              .tailwindColor
                    }`}
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
