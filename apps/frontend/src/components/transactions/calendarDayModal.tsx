'use client';

import { useRef } from 'react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TransactionType, CategoryType, AccountType, RootType } from '@repo/shared';
import { calculateNetAmount, formatCurrency } from '@/lib/utils';
import { CategoryIcon } from '@/components/ui/category-icon';
import { isOutgoingTransfer, isOperateTransaction } from '@repo/shared';
import { ACCOUNT_ICONS, IconName } from '@/lib/icon-mapping';

interface CalendarDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  transactions: TransactionType[];
  categories: CategoryType[];
  accounts: AccountType[];
  onEdit: (id: string) => void;
}

export function CalendarDayModal({
  isOpen,
  onClose,
  date,
  transactions,
  categories,
  accounts,
  onEdit,
}: CalendarDayModalProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Sort transactions by time
  const sortedTransactions = [...transactions].sort((a, b) =>
    a.time.localeCompare(b.time),
  );

  const rowVirtualizer = useVirtualizer({
    count: sortedTransactions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72, // Estimated height of a transaction row
    overscan: 5,
  });

  const getCategory = (id: string) => categories.find((c) => c.id === id);
  const getAccount = (id: string) => accounts.find((a) => a.id === id);

  // Calculate Summary
  const summary = sortedTransactions.reduce(
    (acc, tx) => {
      if (isOperateTransaction(tx)) return acc; // Skip transfers in summary if preferred, or handle logically
      // For simple summary, we might exclude transfers or include them. 
      // Spec says: "當日收入/支出/結餘摘要". 
      // Usually transfers don't affect net wealth, but expenses do.
      if (tx.type === RootType.INCOME) acc.income += tx.amount;
      if (tx.type === RootType.EXPENSE) acc.expense += tx.amount;
      return acc;
    },
    { income: 0, expense: 0 },
  );
  const balance = summary.income - summary.expense;

  if (!date) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] flex flex-col h-[80vh] sm:h-[600px] p-0 gap-0">
        <DialogHeader className="p-6 pb-2 shrink-0">
          <DialogTitle className="text-xl font-medium flex items-center gap-2">
            <span className="text-2xl font-bold">
              {format(date, 'd', { locale: zhTW })}
            </span>
            <span className="text-slate-500 font-normal">
              {format(date, 'MMM EEEE', { locale: zhTW })}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Transaction List (Virtual Scroll) */}
        <div ref={parentRef} className="flex-1 overflow-y-auto min-h-0 px-6 py-2">
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const tx = sortedTransactions[virtualRow.index];
              const category = getCategory(tx.categoryId);
              const account = getAccount(tx.accountId);
              const isTransfer = isOperateTransaction(tx);
              const isOutgoing = isOutgoingTransfer(tx);

              return (
                <div
                  key={tx.id}
                  onClick={() => tx.id && onEdit(tx.id)}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="flex items-center gap-3 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg px-2 transition-colors"
                >
                  {/* Category Icon */}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      isTransfer
                        ? 'bg-amber-100 text-amber-600'
                        : tx.type === RootType.INCOME
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-rose-100 text-rose-600'
                    }`}
                  >
                     <CategoryIcon iconName={category?.icon} className="h-5 w-5" />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-medium truncate text-slate-900 dark:text-slate-100">
                        {category?.name || '未分類'}
                      </span>
                      <span
                        className={`font-mono font-medium ${
                          isTransfer
                            ? 'text-amber-600'
                            : tx.type === RootType.INCOME
                              ? 'text-emerald-600'
                              : 'text-rose-600'
                        }`}
                      >
                         {tx.type === RootType.EXPENSE ? '-' : '+'}{formatCurrency(tx.amount)}
                      </span>
                    </div>
                    <div className="flex items-center text-xs text-slate-500 gap-2">
                      <span className="font-mono">{tx.time.substring(0, 5)}</span>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        {account && ACCOUNT_ICONS[account.icon as IconName] && (
                           (() => {
                               const Icon = ACCOUNT_ICONS[account.icon as IconName];
                               return <Icon className="h-3 w-3" />;
                           })()
                        )}
                        <span>{account?.name}</span>
                      </div>
                      {tx.description && (
                         <>
                           <span>•</span>
                           <span className="truncate">{tx.description}</span>
                         </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {sortedTransactions.length === 0 && (
                <div className="h-full flex items-center justify-center text-slate-400">
                    無交易紀錄
                </div>
            )}
          </div>
        </div>

        {/* Summary Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
            <div className="flex justify-between items-center text-sm">
                <div className="flex gap-4">
                     <div className="flex flex-col">
                        <span className="text-xs text-slate-500">收入</span>
                        <span className="font-mono font-medium text-emerald-600">+{formatCurrency(summary.income)}</span>
                     </div>
                     <div className="flex flex-col">
                        <span className="text-xs text-slate-500">支出</span>
                        <span className="font-mono font-medium text-rose-600">-{formatCurrency(summary.expense)}</span>
                     </div>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-xs text-slate-500">結餘</span>
                     <span className={`font-mono font-bold ${balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {balance >= 0 ? '+' : ''}{formatCurrency(balance)}
                     </span>
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
