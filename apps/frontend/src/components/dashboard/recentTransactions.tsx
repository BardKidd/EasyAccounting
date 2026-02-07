import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TransactionType,
  CategoryType,
  AccountType,
  RootType,
} from '@repo/shared';
import { CategoryIcon } from '@/components/ui/category-icon';
import { formatCurrency, calculateNetAmount } from '@/lib/utils';

function RecentTransactions({
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
    parentColor: string | null = null,
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
    const netAmount = calculateNetAmount(item);
    const isTransfer = !!item.targetAccountId;

    if (isTransfer) {
      return { color: 'text-amber-400', prefix: '', amount: netAmount };
    }

    if (netAmount === 0) {
      return {
        color: 'text-teal-400 drop-shadow-[0_0_8px_rgba(45,212,191,0.3)]',
        prefix: '',
        amount: netAmount,
      };
    }

    return item.type === RootType.INCOME
      ? {
          color: 'text-teal-400 drop-shadow-[0_0_8px_rgba(45,212,191,0.3)]',
          prefix: '+',
          amount: netAmount,
        }
      : {
          color: 'text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.3)]',
          prefix: '-',
          amount: netAmount,
        };
  };

  return (
    <Card className="col-span-3 border-border bg-card shadow-sm h-full flex flex-col hover:shadow-md transition-shadow">
      <CardHeader className="border-b border-border pb-4">
        <CardTitle className="text-lg font-bold text-foreground">
          近期交易
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden pt-4 px-2">
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center h-full">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              {/* Use a placeholder icon or consistent empty state */}
              <div className="w-8 h-8 rounded-md border-2 border-dashed border-muted-foreground/30" />
            </div>
            <p className="text-muted-foreground font-medium">
              尚無交易記錄
            </p>
            <p className="text-sm text-muted-foreground/80 mt-2">
              點擊右上角「新增交易」按鈕開始記帳
            </p>
          </div>
        ) : (
          <div className="space-y-2 h-full overflow-y-auto pr-2 custom-scrollbar">
            {transactions.map((item) => {
              const category = findCategory(item.categoryId, categories);
              const account = accounts.find((a) => a.id === item.accountId);
              const { color, prefix, amount } = getAmountStyle(item);

              return (
                <div
                  key={item.id}
                  className="flex items-center p-3 rounded-xl hover:bg-accent/50 transition-all duration-200 group border border-transparent hover:border-border"
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-inner ${
                      !category?.color ? 'bg-muted' : ''
                    }`}
                    style={{
                      backgroundColor: category?.color
                        ? `${category.color}20` // 透明度
                        : undefined,
                      boxShadow: category?.color
                        ? `0 0 10px ${category.color}10`
                        : 'none',
                    }}
                  >
                    <CategoryIcon
                      iconName={category?.icon}
                      className="h-5 w-5 transition-transform group-hover:scale-110 duration-300"
                      style={{ color: category?.color || 'currentColor' }}
                    />
                  </div>
                  <div className="ml-4 space-y-1 flex-1">
                    <p className="text-sm font-medium leading-none text-foreground group-hover:text-primary transition-colors">
                      {category?.name}
                    </p>
                    <div className="flex items-center gap-2">
                      {item.description && (
                        <span className="text-xs text-muted-foreground max-w-[150px] truncate">
                          {item.description}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground/80">
                        {account?.name} • {item.date}
                      </span>
                    </div>
                  </div>
                  <div
                    className={`ml-auto font-bold font-mono tracking-tight ${color}`}
                  >
                    {prefix}
                    {formatCurrency(Math.abs(amount))}
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

export default RecentTransactions;
