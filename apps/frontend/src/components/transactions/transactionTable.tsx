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
        <span className="text-teal-400 drop-shadow-[0_0_8px_rgba(45,212,191,0.3)] font-bold font-mono tracking-tight">
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
        <span className="text-teal-400 drop-shadow-[0_0_8px_rgba(45,212,191,0.3)] font-bold font-mono tracking-tight">
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
      <div className="flex flex-col items-center justify-center p-12 text-center border border-border rounded-2xl bg-card backdrop-blur-sm h-80 shadow-sm">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <ArrowRightLeft className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-bold text-foreground">
          尚無交易紀錄
        </h3>
        <p className="text-sm text-muted-foreground mt-2">
          試著新增一筆交易或調整篩選條件
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-border bg-card shadow-sm overflow-hidden">
        <div className="rounded-md">
          <Table data-testid="transaction-table">
            <TableHeader className="bg-muted/50">
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="w-[120px] text-muted-foreground font-medium">
                  日期
                </TableHead>
                <TableHead className="w-[100px] text-muted-foreground font-medium">
                  類型
                </TableHead>
                <TableHead className="w-[200px] text-muted-foreground font-medium">
                  分類
                </TableHead>
                <TableHead className="w-[200px] text-muted-foreground font-medium">
                  帳戶
                </TableHead>
                <TableHead className="text-muted-foreground font-medium">
                  備註
                </TableHead>
                <TableHead className="text-right w-[150px] text-muted-foreground font-medium">
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
                    className="border-b border-border hover:bg-muted/50 transition-colors"
                  >
                    <TableCell className="font-mono text-sm text-foreground">
                      <div>
                        {format(new Date(transaction.date), 'yyyy-MM-dd')}
                      </div>
                      <div className="text-xs text-muted-foreground">
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
                              : 'bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400'
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
                              ? 'bg-muted'
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
                            style={{ color: category?.color || 'currentColor' }}
                          />
                        </div>
                        <span className="text-sm font-medium text-foreground">
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
                                <span className="text-muted-foreground">未知帳戶</span>
                              );
                            const Icon =
                              ACCOUNT_ICONS[account.icon as IconName];
                            return (
                              <>
                                {Icon && (
                                  <Icon className="h-4 w-4 text-muted-foreground" />
                                )}
                                <span className="text-sm text-foreground">
                                  {account.name}
                                </span>
                              </>
                            );
                          })()}
                        </div>

                        {/* Target Account */}
                        {transaction.targetAccountId && (
                          <div className="flex items-center gap-2 text-muted-foreground pl-2 border-l-2 border-border">
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
                        className="text-sm text-muted-foreground truncate block"
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
