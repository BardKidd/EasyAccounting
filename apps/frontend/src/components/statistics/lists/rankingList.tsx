'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { getIcon } from '@/lib/icon-mapping';
import { MainType, RankingTabDataType } from '@repo/shared';

interface RankingListProps {
  transactions: RankingTabDataType[];
}

export function RankingList({ transactions }: RankingListProps) {
  const getAmountStyle = (item: RankingTabDataType) => {
    if (item.isTransfer) {
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
        <CardTitle>排行列表</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[600px] overflow-y-auto px-6 py-2">
          {transactions.map((item, index) => {
            const { color, prefix } = getAmountStyle(item);
            const IconComponent = getIcon(item.categoryIcon);

            return (
              <div
                key={item.id}
                className="flex items-center py-4 px-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              >
                {/* Rank (Optional, implicit by order) or Icon */}
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
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
                <div className="ml-4 flex-1 min-w-0">
                  <p className="text-sm font-medium leading-none truncate">
                    {item.categoryName}{' '}
                    <span className="text-muted-foreground font-normal text-xs ml-2">
                      {item.description}
                    </span>
                  </p>
                </div>

                {/* Right: Amount & Account */}
                <div className="ml-4 text-right shrink-0">
                  <div className={`text-sm font-medium ${color}`}>
                    {prefix}
                    {formatCurrency(item.amount)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {item.accountName}
                  </div>
                </div>
              </div>
            );
          })}
          {transactions.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              尚無資料
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
