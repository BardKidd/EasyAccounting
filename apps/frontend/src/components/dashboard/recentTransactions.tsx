import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TransactionType,
  CategoryType,
  AccountType,
  RootType,
} from '@repo/shared';
import { getIcon } from '@/lib/icon-mapping';
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
        color: 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]',
        prefix: '',
        amount: netAmount,
      };
    }

    return item.type === RootType.INCOME
      ? {
          color: 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]',
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
    <Card className="col-span-3 border-0 bg-white/80 dark:bg-slate-900/50 backdrop-blur-md shadow-lg shadow-slate-200/50 dark:shadow-black/10 ring-1 ring-slate-200 dark:ring-white/10 h-full flex flex-col">
      <CardHeader className="border-b border-slate-200 dark:border-white/5 pb-4">
        <CardTitle className="text-lg font-bold font-playfair text-slate-900 dark:text-white">
          近期交易
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden pt-4 px-2">
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center h-full">
            <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
              {/* Use a placeholder icon or consistent empty state */}
              <div className="w-8 h-8 rounded-md border-2 border-dashed border-slate-300 dark:border-slate-600" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              尚無交易記錄
            </p>
            <p className="text-sm text-slate-500 mt-2">
              點擊右上角「新增交易」按鈕開始記帳
            </p>
          </div>
        ) : (
          <div className="space-y-2 h-full overflow-y-auto pr-2 custom-scrollbar">
            {transactions.map((item) => {
              const category = findCategory(item.categoryId, categories);
              const account = accounts.find((a) => a.id === item.accountId);
              const { color, prefix, amount } = getAmountStyle(item);
              const IconComponent = getIcon(category?.icon);

              return (
                <div
                  key={item.id}
                  className="flex items-center p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all duration-200 group border border-transparent hover:border-slate-200 dark:hover:border-white/5"
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-inner ${
                      !category?.color ? 'bg-slate-100 dark:bg-slate-800' : ''
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
                    <IconComponent
                      className="h-5 w-5 transition-transform group-hover:scale-110 duration-300"
                      style={{ color: category?.color || '#94a3b8' }}
                    />
                  </div>
                  <div className="ml-4 space-y-1 flex-1">
                    <p className="text-sm font-medium leading-none text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                      {category?.name}
                    </p>
                    <div className="flex items-center gap-2">
                      {item.description && (
                        <span className="text-xs text-slate-500 max-w-[150px] truncate">
                          {item.description}
                        </span>
                      )}
                      <span className="text-xs text-slate-600">
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
