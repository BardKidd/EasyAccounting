import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TransactionType,
  CategoryType,
  AccountType,
  MainType,
} from '@repo/shared';
import { getIcon } from '@/lib/icon-mapping';

export function RecentTransactions({
  transactions,
  categories,
  accounts,
}: {
  transactions: TransactionType[];
  categories: CategoryType[];
  accounts: AccountType[];
}) {
  const findCategory = (
    id: string,
    categoryList: CategoryType[],
    parentColor: string | null = null
  ): CategoryType | null => {
    for (const category of categoryList) {
      const effectiveColor = category.color || parentColor;
      if (category.id === id) return { ...category, color: effectiveColor };
      // children 只會有下一層的資料，再更下面不會有了，所以還是會需要保留這段。
      if (category.children && category.children.length > 0) {
        const found = findCategory(id, category.children, effectiveColor);
        if (found) return found;
      }
    }
    return null;
  };

  const getAmountStyle = (item: TransactionType) => {
    if (item.targetAccountId) {
      return { color: 'text-orange-500', prefix: '' };
    }
    return item.type === MainType.INCOME
      ? { color: 'text-green-600', prefix: '+' }
      : { color: 'text-red-600', prefix: '-' };
  };

  const formatAmount = (amount: number) => {
    return (
      '$' +
      new Intl.NumberFormat('zh-TW', {
        style: 'decimal',
        maximumFractionDigits: 0,
      }).format(amount)
    );
  };

  console.log(categories);
  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>近期交易</CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">尚無交易記錄</p>
            <p className="text-sm text-muted-foreground mt-2">
              點擊右上角「新增交易」按鈕開始記帳
            </p>
          </div>
        ) : (
          <div className="space-y-8 h-[400px] overflow-y-auto pr-4">
            {transactions.map((item) => {
              const category = findCategory(item.categoryId, categories);
              const account = accounts.find((a) => a.id === item.accountId);
              const { color, prefix } = getAmountStyle(item);
              const IconComponent = getIcon(category?.icon);

              return (
                <div key={item.id} className="flex items-center">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      !category?.color ? 'bg-muted' : ''
                    }`}
                    style={{
                      backgroundColor: category?.color
                        ? `${category.color}20` // 透明度
                        : undefined,
                    }}
                  >
                    <IconComponent
                      className="h-5 w-5"
                      style={{ color: category?.color || 'inherit' }}
                    />
                  </div>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {category?.name}
                    </p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {account?.name} • {item.date}
                    </p>
                  </div>
                  <div className={`ml-auto font-medium ${color}`}>
                    {prefix}
                    {formatAmount(item.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
