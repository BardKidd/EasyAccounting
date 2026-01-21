'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import {
  TransactionResponse,
  RootType,
  CategoryType,
  AccountType,
} from '@repo/shared';
import CustomPagination from '@/components/customPagination';
import { format } from 'date-fns';
import { ArrowRightLeft } from 'lucide-react';
import { ACCOUNT_ICONS, IconName } from '@/lib/icon-mapping';
import { CategoryIcon } from '@/components/ui/category-icon';
import { calculateNetAmount, formatCurrency } from '@/lib/utils'; // Added formatCurrency

interface TransactionTableProps {
  transactions: TransactionResponse;
  categories: CategoryType[];
  accounts: AccountType[];
}

function TransactionTable({
  transactions,
  categories,
  accounts,
}: TransactionTableProps) {
  // Helper to find category with color inheritance
  const findCategory = (
    id: string,
    categoryList: CategoryType[],
    parentColor: string | null = null,
  ): CategoryType | null => {
    for (const category of categoryList) {
      const effectiveColor = category.color || parentColor;
      if (category.id === id) return { ...category, color: effectiveColor };
      if (category.children && category.children.length > 0) {
        const found = findCategory(id, category.children, effectiveColor);
        if (found) return found;
      }
    }
    return null;
  };

  const getAccount = (id: string) => {
    return accounts.find((a) => a.id === id);
  };

  // Check if transaction is a transfer
  const isTransfer = (item: any) => !!item.targetAccountId;

  const formatAmount = (item: any) => {
    const netAmount = calculateNetAmount(item);
    // Use formatCurrency from utils or just toLocaleString (keeping consistency with dashboard which uses formatCurrency)
    const formatted = formatCurrency(Math.abs(netAmount));

    if (isTransfer(item)) {
      return (
        <span className="text-amber-400 font-bold font-mono tracking-tight">
          {formatted}
        </span>
      );
    }

    if (netAmount === 0) {
      return (
        <span className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)] font-bold font-mono tracking-tight">
          {formatted}
        </span>
      );
    }

    if (item.type === RootType.EXPENSE) {
      return (
        <span className="text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.3)] font-bold font-mono tracking-tight">
          -{formatted}
        </span>
      );
    }
    if (item.type === RootType.INCOME) {
      return (
        <span className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)] font-bold font-mono tracking-tight">
          +{formatted}
        </span>
      );
    }
    return (
      <span className="text-slate-600 font-bold font-mono tracking-tight">
        {formatted}
      </span>
    );
  };

  if (transactions?.items?.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border-0 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm h-80 ring-1 ring-slate-200 dark:ring-white/10">
        <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
          <ArrowRightLeft className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">
          尚無交易紀錄
        </h3>
        <p className="text-sm text-slate-500 mt-2">
          試著新增一筆交易或調整篩選條件
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-0 bg-white/80 dark:bg-slate-900/50 backdrop-blur-md shadow-lg shadow-slate-200/50 dark:shadow-black/10 ring-1 ring-slate-200 dark:ring-white/10 overflow-hidden">
        <div className="rounded-md">
          <Table>
            <TableHeader className="bg-slate-50/50 dark:bg-white/5">
              <TableRow className="border-b border-slate-200 dark:border-white/5 hover:bg-transparent">
                <TableHead className="w-[120px] text-slate-500 font-medium">
                  日期
                </TableHead>
                <TableHead className="w-[100px] text-slate-500 font-medium">
                  類型
                </TableHead>
                <TableHead className="w-[200px] text-slate-500 font-medium">
                  分類
                </TableHead>
                <TableHead className="w-[200px] text-slate-500 font-medium">
                  帳戶
                </TableHead>
                <TableHead className="text-slate-500 font-medium">
                  備註
                </TableHead>
                <TableHead className="text-right w-[150px] text-slate-500 font-medium">
                  金額
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions?.items?.map((transaction) => {
                const category = findCategory(
                  transaction.categoryId,
                  categories,
                );

                return (
                  <TableRow
                    key={transaction.id}
                    className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors"
                  >
                    <TableCell className="font-mono text-sm text-slate-600 dark:text-slate-300">
                      <div>
                        {format(new Date(transaction.date), 'yyyy-MM-dd')}
                      </div>
                      <div className="text-xs text-slate-400">
                        {transaction.time}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                          isTransfer(transaction)
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                            : transaction.type === RootType.EXPENSE
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                        }`}
                      >
                        {isTransfer(transaction)
                          ? RootType.OPERATE
                          : transaction.type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-lg shadow-sm ${
                            !category?.color
                              ? 'bg-slate-100 dark:bg-slate-800'
                              : ''
                          }`}
                          style={{
                            backgroundColor: category?.color
                              ? `${category.color}20`
                              : undefined,
                          }}
                        >
                          <CategoryIcon
                            iconName={category?.icon}
                            className="h-4 w-4"
                            style={{ color: category?.color || '#94a3b8' }}
                          />
                        </div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                          {category?.name || '未分類'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5">
                        {/* Source Account */}
                        <div className="flex items-center gap-2">
                          {(() => {
                            const account = getAccount(transaction.accountId);
                            if (!account)
                              return (
                                <span className="text-slate-400">未知帳戶</span>
                              );
                            const Icon =
                              ACCOUNT_ICONS[account.icon as IconName];
                            return (
                              <>
                                {Icon && (
                                  <Icon className="h-4 w-4 text-slate-400" />
                                )}
                                <span className="text-sm text-slate-600 dark:text-slate-300">
                                  {account.name}
                                </span>
                              </>
                            );
                          })()}
                        </div>

                        {/* Target Account */}
                        {transaction.targetAccountId && (
                          <div className="flex items-center gap-2 text-slate-400 pl-2 border-l-2 border-slate-200 dark:border-slate-700">
                            {(() => {
                              const targetAccount = getAccount(
                                transaction.targetAccountId!,
                              );
                              if (!targetAccount) return <span>未知帳戶</span>;
                              const TargetIcon =
                                ACCOUNT_ICONS[targetAccount.icon as IconName];
                              return (
                                <>
                                  {TargetIcon && (
                                    <TargetIcon className="h-3.5 w-3.5" />
                                  )}
                                  <span className="text-xs">
                                    {targetAccount.name}
                                  </span>
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <span
                        className="text-sm text-slate-600 dark:text-slate-400 truncate block"
                        title={transaction.description || ''}
                      >
                        {transaction.description || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatAmount(transaction)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
      <CustomPagination pagination={transactions.pagination} />
    </div>
  );
}

export default TransactionTable;
