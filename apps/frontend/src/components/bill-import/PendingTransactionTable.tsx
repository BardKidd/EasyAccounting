'use client';

import React from 'react';
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

export function PendingTransactionTable({
  transactions,
  categories,
  accounts,
  selectedAccountId,
  onAccountChange,
  onUpdate,
}: PendingTransactionTableProps) {
  const mainCategories = getExpenseMainCategories(categories);

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
              <TableHead className="w-[50px]">匯入</TableHead>
              <TableHead className="w-[120px]">日期</TableHead>
              <TableHead className="w-[200px]">商家/描述</TableHead>
              <TableHead className="w-[100px]">金額</TableHead>
              <TableHead className="w-[150px]">類別</TableHead>
              <TableHead className="w-[100px]">分期</TableHead>
              <TableHead className="w-[100px]">狀態</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => {
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
                  <TableCell>
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
                      value={tx.transactionData.categoryId || ''}
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
                        {mainCategories.map((main) => {
                          const hasSubs =
                            main.children && main.children.length > 0;
                          if (!hasSubs) {
                            // Main 沒有子分類 → 直接可選
                            return (
                              <SelectItem key={main.id} value={main.id}>
                                {main.name}
                              </SelectItem>
                            );
                          }
                          // Main 有子分類 → group header + sub items
                          return (
                            <SelectGroup key={main.id}>
                              <SelectLabel className="text-xs font-semibold text-muted-foreground">
                                {main.name}
                              </SelectLabel>
                              {main.children!.map((sub) => (
                                <SelectItem
                                  key={sub.id}
                                  value={sub.id}
                                  className="pl-6"
                                >
                                  {sub.name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          );
                        })}
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
