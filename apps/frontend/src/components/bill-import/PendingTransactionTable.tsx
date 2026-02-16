'use client';

import React, { useMemo, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PendingTransaction,
  PendingTransactionStatus,
  CategoryType,
  AccountType,
  RootType,
} from '@repo/shared';
import { cn } from '@/lib/utils';
import { Link, AlertTriangle } from 'lucide-react';

interface PendingTransactionTableProps {
  transactions: PendingTransaction[];
  categories: CategoryType[];
  accounts: AccountType[];
  selectedAccountId: string;
  onAccountChange: (accountId: string) => void;
  onUpdate: (id: string, updates: Partial<PendingTransaction>) => void;
}

// Helper to check validity
const isValid = (tx: PendingTransaction, selectedAccountId: string) => {
  return (
    tx.transactionData.date &&
    tx.transactionData.amount &&
    tx.transactionData.description &&
    tx.transactionData.categoryId &&
    selectedAccountId
  );
};

// 取得支出類的 Main Categories（帳單通常都是支出）
const getExpenseMainCategories = (categories: CategoryType[]) => {
  const expenseRoot = categories.find((c) => c.type === RootType.EXPENSE);
  return expenseRoot?.children || [];
};

// Memoized 類別選項，避免每個 row 每次 open 都重新渲染
const CategorySelectItems = React.memo(
  ({ mainCategories }: { mainCategories: CategoryType[] }) => (
    <>
      {mainCategories.map((main) => {
        const hasSubs = main.children && main.children.length > 0;
        if (!hasSubs) {
          return (
            <SelectItem key={main.id} value={main.id}>
              {main.name}
            </SelectItem>
          );
        }
        return (
          <SelectGroup key={main.id}>
            <SelectLabel className="text-xs font-semibold text-muted-foreground">
              {main.name}
            </SelectLabel>
            {main.children!.map((sub) => (
              <SelectItem key={sub.id} value={sub.id} className="pl-6">
                {sub.name}
              </SelectItem>
            ))}
          </SelectGroup>
        );
      })}
    </>
  ),
);
CategorySelectItems.displayName = 'CategorySelectItems';

export function PendingTransactionTable({
  transactions,
  categories,
  accounts,
  selectedAccountId,
  onAccountChange,
  onUpdate,
}: PendingTransactionTableProps) {
  const mainCategories = useMemo(
    () => getExpenseMainCategories(categories),
    [categories],
  );

  // 按日期 > 時間由新到舊排序
  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      const dateA = a.transactionData.date || '';
      const dateB = b.transactionData.date || '';
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      const timeA = a.transactionData.time || '';
      const timeB = b.transactionData.time || '';
      return timeB.localeCompare(timeA);
    });
  }, [transactions]);

  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">無待確認交易</div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 帳戶選擇器 — 整批共用 */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-foreground whitespace-nowrap">
          匯入帳戶
        </label>
        <Select value={selectedAccountId} onValueChange={onAccountChange}>
          <SelectTrigger
            className={cn('w-[240px]', !selectedAccountId && 'border-red-500')}
          >
            <SelectValue placeholder="選擇此帳單的帳戶" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((acc) => (
              <SelectItem key={acc.id} value={acc.id}>
                {acc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!selectedAccountId && (
          <span className="text-xs text-red-500">請先選擇帳戶</span>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px] text-center">匯入</TableHead>
              <TableHead className="w-[120px]">日期</TableHead>
              <TableHead className="w-[80px]">時間</TableHead>
              <TableHead className="w-[200px]">商家/描述</TableHead>
              <TableHead className="w-[100px]">金額</TableHead>
              <TableHead className="w-[150px]">類別</TableHead>
              <TableHead className="w-[100px]">分期</TableHead>
              <TableHead className="w-[100px]">狀態</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTransactions.map((tx) => {
              const isConfirmed =
                tx.status === PendingTransactionStatus.CONFIRMED;
              const isSkipped = tx.status === PendingTransactionStatus.SKIPPED;
              const hasMatch = !!tx.matchedTransactionId;
              const rowValid = isValid(tx, selectedAccountId);

              return (
                <TableRow
                  key={tx.id}
                  className={cn(
                    isSkipped && 'opacity-50 line-through bg-muted/50',
                    isConfirmed && 'bg-emerald-50/50 dark:bg-emerald-900/10',
                  )}
                >
                  <TableCell className="text-center">
                    <Checkbox
                      checked={!isSkipped}
                      onCheckedChange={(checked) => {
                        onUpdate(tx.id, {
                          status: checked
                            ? PendingTransactionStatus.PENDING
                            : PendingTransactionStatus.SKIPPED,
                        });
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      defaultValue={tx.transactionData.date}
                      onBlur={(e) => {
                        if (e.target.value !== tx.transactionData.date) {
                          onUpdate(tx.id, {
                            transactionData: {
                              ...tx.transactionData,
                              date: e.target.value,
                            },
                          });
                        }
                      }}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="time"
                      step="1"
                      defaultValue={tx.transactionData.time || ''}
                      onBlur={(e) => {
                        if (
                          e.target.value !== (tx.transactionData.time || '')
                        ) {
                          onUpdate(tx.id, {
                            transactionData: {
                              ...tx.transactionData,
                              time: e.target.value || null,
                            },
                          });
                        }
                      }}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      defaultValue={tx.transactionData.description}
                      onBlur={(e) => {
                        if (e.target.value !== tx.transactionData.description) {
                          onUpdate(tx.id, {
                            transactionData: {
                              ...tx.transactionData,
                              description: e.target.value,
                            },
                          });
                        }
                      }}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      defaultValue={tx.transactionData.amount}
                      onBlur={(e) => {
                        const val = Number(e.target.value);
                        if (val !== tx.transactionData.amount) {
                          onUpdate(tx.id, {
                            transactionData: {
                              ...tx.transactionData,
                              amount: val,
                            },
                          });
                        }
                      }}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={tx.transactionData.categoryId || undefined}
                      onValueChange={(val) =>
                        onUpdate(tx.id, {
                          transactionData: {
                            ...tx.transactionData,
                            categoryId: val,
                          },
                        })
                      }
                    >
                      <SelectTrigger
                        className={cn(
                          'h-8',
                          !tx.transactionData.categoryId && 'border-red-500',
                        )}
                      >
                        <SelectValue placeholder="選擇類別" />
                      </SelectTrigger>
                      <SelectContent>
                        <CategorySelectItems mainCategories={mainCategories} />
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {tx.isInstallment && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                        {tx.installmentNumber
                          ? `第 ${tx.installmentNumber} 期`
                          : '分期'}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {hasMatch && (
                        <div title="疑似重複 / 分期匹配">
                          <Link className="h-4 w-4 text-amber-500" />
                        </div>
                      )}
                      {!rowValid && !isSkipped && (
                        <div title="欄位缺漏">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
