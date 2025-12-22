'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { getIcon } from '@/lib/icon-mapping';
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
    <Card>
      <CardHeader>
        <CardTitle>類別列表</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-0 divide-y">
          {/* List Items */}
          <div className="max-h-[400px] overflow-y-auto px-6 py-2">
            {items.map((item) => {
              const IconComponent = getIcon(item.icon);

              return (
                <div
                  key={`${item.id}-${item.name}-${Math.random()}`}
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
                  <div className={`ml-auto font-medium text-sm ${amountColor}`}>
                    {formatCurrency(item.amount)}
                  </div>
                </div>
              );
            })}
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
