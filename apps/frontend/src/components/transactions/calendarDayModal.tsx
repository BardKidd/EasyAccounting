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
import {
  TransactionType,
  CategoryType,
  AccountType,
  RootType,
} from '@repo/shared';
import { formatCurrency } from '@/lib/utils';
import { CategoryIcon } from '@/components/ui/category-icon';
import { isOperateTransaction } from '@repo/shared';
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
    estimateSize: () => 72,
    overscan: 5,
  });

  const getCategory = (id: string) => categories.find((c) => c.id === id);
  const getAccount = (id: string) => accounts.find((a) => a.id === id);

  // Calculate Summary
  const summary = sortedTransactions.reduce(
    (acc, tx) => {
      if (isOperateTransaction(tx)) return acc;
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
      <DialogContent
        data-testid="day-modal"
        className="sm:max-w-[500px] flex flex-col h-[80vh] sm:h-[600px] p-0 gap-0 border-slate-200 dark:border-slate-800"
      >
        <DialogHeader className="p-6 pb-4 shrink-0 bg-linear-to-b from-teal-50/50 to-transparent dark:from-teal-950/20">
          <DialogTitle className="text-xl font-medium flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 text-lg font-bold">
              {format(date, 'd', { locale: zhTW })}
            </span>
            <span className="text-slate-600 dark:text-slate-400 font-normal">
              {format(date, 'MMM EEEE', { locale: zhTW })}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Transaction List (Virtual Scroll) */}
        <div
          ref={parentRef}
          className="flex-1 overflow-y-auto min-h-0 px-6 py-2"
        >
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
                  className="flex items-center gap-3 py-3 border-b border-slate-100 dark:border-slate-800/50 last:border-0 cursor-pointer hover:bg-teal-50/50 dark:hover:bg-teal-900/20 rounded-lg px-2 transition-colors"
                >
                  {/* Category Icon */}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      isTransfer
                        ? 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-400'
                        : tx.type === RootType.INCOME
                          ? 'bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400'
                          : 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400'
                    }`}
                  >
                    <CategoryIcon
                      iconName={category?.icon}
                      className="h-5 w-5"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-medium truncate text-slate-800 dark:text-slate-100">
                        {category?.name || '未分類'}
                      </span>
                      <span
                        className={`font-mono font-semibold ${
                          isTransfer
                            ? 'text-cyan-600 dark:text-cyan-400'
                            : tx.type === RootType.INCOME
                              ? 'text-teal-600 dark:text-teal-400'
                              : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {tx.type === RootType.EXPENSE ? '-' : '+'}
                        {formatCurrency(tx.amount)}
                      </span>
                    </div>
                    <div className="flex items-center text-xs text-slate-500 dark:text-slate-500 gap-2">
                      <span className="font-mono">
                        {tx.time.substring(0, 5)}
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">
                        •
                      </span>
                      <div className="flex items-center gap-1">
                        {account &&
                          ACCOUNT_ICONS[account.icon as IconName] &&
                          (() => {
                            const Icon =
                              ACCOUNT_ICONS[account.icon as IconName];
                            return <Icon className="h-3 w-3" />;
                          })()}
                        <span>{account?.name}</span>
                      </div>
                      {tx.description && (
                        <>
                          <span className="text-slate-300 dark:text-slate-700">
                            •
                          </span>
                          <span className="truncate">{tx.description}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {sortedTransactions.length === 0 && (
              <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-600">
                無交易紀錄
              </div>
            )}
          </div>
        </div>

        {/* Summary Footer */}
        <div className="p-4 bg-linear-to-t from-slate-50 to-transparent dark:from-slate-900/80 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex justify-between items-center text-sm">
            <div className="flex gap-6">
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 dark:text-slate-500">
                  收入
                </span>
                <span className="font-mono font-semibold text-teal-600 dark:text-teal-400">
                  +{formatCurrency(summary.income)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 dark:text-slate-500">
                  支出
                </span>
                <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">
                  -{formatCurrency(summary.expense)}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs text-slate-500 dark:text-slate-500">
                結餘
              </span>
              <span
                className={`font-mono font-bold ${balance >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-rose-600 dark:text-rose-400'}`}
              >
                {balance >= 0 ? '+' : ''}
                {formatCurrency(balance)}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
