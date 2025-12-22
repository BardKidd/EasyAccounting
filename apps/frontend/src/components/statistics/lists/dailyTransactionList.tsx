'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { getIcon } from '@/lib/icon-mapping';
import { DetailsTransaction, MainType } from '@repo/shared';

interface DailyTransactionListProps {
  transactions: DetailsTransaction[];
}

export function DailyTransactionList({
  transactions,
}: DailyTransactionListProps) {
  const getAmountStyle = (item: DetailsTransaction) => {
    if (item.targetAccountName) {
      return { color: 'text-orange-500', prefix: '' };
    }

    if (item.type === MainType.INCOME)
      return { color: 'text-green-600', prefix: '+' };
    if (item.type === MainType.EXPENSE)
      return { color: 'text-red-600', prefix: '-' };

    return { color: 'text-gray-600', prefix: '' };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>明細列表</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {transactions.map((item) => {
            const { color, prefix } = getAmountStyle(item);
            const IconComponent = getIcon(item.categoryIcon);

            return (
              <div
                key={item.id}
                className="flex items-center p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              >
                {/* Icon */}
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: `${item.categoryColor}20`,
                  }}
                >
                  <IconComponent
                    className="h-5 w-5"
                    style={{ color: item.categoryColor }}
                  />
                </div>

                {/* Description & Date */}
                <div className="ml-4 space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium leading-none">
                      {item.categoryName}{' '}
                      <span className="text-muted-foreground font-normal text-xs ml-2">
                        {item.description}
                      </span>
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.accountName}{' '}
                    {item.targetAccountName && `→ ${item.targetAccountName}`} •{' '}
                    {item.date}
                  </p>
                </div>

                {/* Amount */}
                <div className={`ml-auto font-medium ${color}`}>
                  {prefix}
                  {formatCurrency(item.amount)}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
