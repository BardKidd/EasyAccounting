'use client';

import { format, isToday } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Plus } from 'lucide-react';

import {
  AccountType,
  CategoryType,
  RootType,
  TransactionType,
  isOperateTransaction,
} from '@repo/shared';
import { Button } from '@/components/ui/button';
import { CategoryIcon } from '@/components/ui/category-icon';
import { ACCOUNT_ICONS, IconName } from '@/lib/icon-mapping';
import { formatCurrency } from '@/lib/utils';
import { getDaySummary } from '@/lib/calendarUtils';
import { TRANSACTION_COLORS } from '@/lib/transactionColors';

interface DayTransactionListProps {
  /** 選取日 */
  date: Date;
  /** 已篩選為該日的交易 */
  transactions: TransactionType[];
  categories: CategoryType[];
  accounts: AccountType[];
  onEdit: (id: string) => void;
  /** 空狀態的新增入口 */
  onCreate: () => void;
}

// 遞迴搜尋分類（與 CalendarDayModal 同邏輯）
const findCategory = (
  id: string,
  categoryList: CategoryType[],
): CategoryType | undefined => {
  for (const cat of categoryList) {
    if (cat.id === id) return cat;
    if (cat.children && cat.children.length > 0) {
      const found = findCategory(id, cat.children);
      if (found) return found;
    }
  }
  return undefined;
};

/**
 * 手機版日曆下方的當日交易 List：取代 CalendarDayModal 在手機上的角色。
 * Row 視覺沿用 day modal 的設計（分類圓 icon、時間·帳戶、等寬金額）。
 */
export function DayTransactionList({
  date,
  transactions,
  categories,
  accounts,
  onEdit,
  onCreate,
}: DayTransactionListProps) {
  const sortedTransactions = [...transactions].sort((a, b) =>
    a.time.localeCompare(b.time),
  );
  const summary = getDaySummary(sortedTransactions);

  const getAccount = (id: string) => accounts.find((a) => a.id === id);

  return (
    <div className="border-t border-slate-200/50 dark:border-white/10">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-5 pt-3 pb-1">
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 font-display tracking-tight">
          {format(date, 'M月d日 EEE', { locale: zhTW })}
          {isToday(date) && (
            <span className="ml-1.5 font-normal text-emerald-600 dark:text-emerald-400">
              · 今天
            </span>
          )}
        </span>
        <span
          data-testid="day-list-summary"
          className="text-xs tabular-nums text-slate-500 dark:text-slate-400"
        >
          支出{' '}
          <span className="font-semibold text-rose-600 dark:text-rose-400">
            -{formatCurrency(summary.expense)}
          </span>
          {' · '}收入{' '}
          <span className="font-semibold text-teal-600 dark:text-teal-400">
            +{formatCurrency(summary.income)}
          </span>
          {' · '}結餘{' '}
          <span
            className={
              summary.balance >= 0
                ? 'font-semibold text-teal-600 dark:text-teal-400'
                : 'font-semibold text-rose-600 dark:text-rose-400'
            }
          >
            {summary.balance >= 0 ? '+' : ''}
            {formatCurrency(summary.balance)}
          </span>
        </span>
      </div>

      {sortedTransactions.length === 0 ? (
        <div
          data-testid="day-list-empty"
          className="flex flex-col items-center gap-3 px-6 py-10 text-sm text-slate-400 dark:text-slate-500"
        >
          這天沒有紀錄
          <Button
            variant="outline"
            size="sm"
            onClick={onCreate}
            className="h-9 rounded-full px-4 text-xs font-medium bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200/50 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 hover:text-emerald-800 dark:hover:text-emerald-200"
          >
            <Plus className="h-3.5 w-3.5" />
            新增交易
          </Button>
        </div>
      ) : (
        <div className="px-3 pb-3">
          {sortedTransactions.map((tx) => {
            const category = findCategory(tx.categoryId, categories);
            const account = getAccount(tx.accountId);
            const isTransfer = isOperateTransaction(tx);
            const colors = isTransfer
              ? TRANSACTION_COLORS.transfer
              : tx.type === RootType.INCOME
                ? TRANSACTION_COLORS.income
                : TRANSACTION_COLORS.expense;

            return (
              <div
                key={tx.id}
                data-testid="day-list-row"
                onClick={() => tx.id && onEdit(tx.id)}
                className="flex cursor-pointer items-center gap-3 rounded-lg border-b border-slate-100 px-2 py-3 transition-colors last:border-0 hover:bg-teal-50/50 dark:border-slate-800/50 dark:hover:bg-teal-900/20"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${colors.bg} ${colors.icon} ${colors.bgDark} ${colors.iconDark}`}
                >
                  <CategoryIcon iconName={category?.icon} className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center justify-between gap-2">
                    <span className="truncate font-medium text-slate-800 dark:text-slate-100">
                      {category?.name || '未分類'}
                    </span>
                    <span
                      className={`font-mono font-semibold tabular-nums ${colors.icon} ${colors.iconDark}`}
                    >
                      {isTransfer
                        ? ''
                        : tx.type === RootType.EXPENSE
                          ? '-'
                          : '+'}
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-500">
                    <span className="font-mono">{tx.time.substring(0, 5)}</span>
                    <span className="text-slate-300 dark:text-slate-700">
                      •
                    </span>
                    <div className="flex items-center gap-1">
                      {account &&
                        ACCOUNT_ICONS[account.icon as IconName] &&
                        (() => {
                          const Icon = ACCOUNT_ICONS[account.icon as IconName];
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
        </div>
      )}
    </div>
  );
}
