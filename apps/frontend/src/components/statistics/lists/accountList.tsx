'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { getIcon } from '@/lib/icon-mapping';
import { StatisticsType, STATISTICS_CONFIG } from '../constants';
import { AccountTabDataType, MainType } from '@repo/shared';

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
    <Card>
      <CardHeader>
        <CardTitle>帳戶列表</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-0 divide-y">
          {/* List Items */}
          <div className="max-h-[400px] overflow-y-auto px-6 py-2">
            {items.map((item) => {
              const IconComponent = getIcon(item.icon) || getIcon('Wallet');

              return (
                <div
                  key={item.id}
                  className="flex items-center py-4 px-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  {/* Icon */}
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg"
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
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium leading-none">
                      {item.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.count} 筆交易
                    </p>
                  </div>

                  {/* Amount */}
                  <div
                    className={`ml-auto font-medium text-sm ${
                      item.isTransfer
                        ? item.type === MainType.INCOME
                          ? STATISTICS_CONFIG[StatisticsType.TRANSFER_IN]
                              .tailwindColor
                          : STATISTICS_CONFIG[StatisticsType.TRANSFER_OUT]
                              .tailwindColor
                        : item.type === MainType.INCOME
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
              <div className="text-center py-10 text-muted-foreground">
                尚無資料
              </div>
            )}
          </div>

          {/* Footer - Total */}
          <div className="bg-muted/30 px-6 py-4 flex items-center justify-between font-semibold">
            <span>總計</span>
            <span className={`text-lg ${amountColor}`}>
              {formatCurrency(totalAmount)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
