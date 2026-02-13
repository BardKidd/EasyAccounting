'use client';

import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PendingTransaction,
  PendingTransactionStatus,
  SubType,
  Account,
} from '@repo/shared';
import { cn } from '@/lib/utils';
import { Check, X, Link, AlertTriangle } from 'lucide-react';

interface PendingTransactionTableProps {
  transactions: PendingTransaction[];
  onUpdate: (id: string, updates: Partial<PendingTransaction>) => void;
}

// Helper to check validity
const isValid = (tx: PendingTransaction) => {
  return (
    tx.transactionData.date &&
    tx.transactionData.amount &&
    tx.transactionData.description &&
    tx.transactionData.categoryId &&
    tx.transactionData.accountId
  );
};

export function PendingTransactionTable({
  transactions,
  onUpdate,
}: PendingTransactionTableProps) {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">無待確認交易</div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">匯入</TableHead>
            <TableHead className="w-[120px]">日期</TableHead>
            <TableHead className="w-[200px]">商家/描述</TableHead>
            <TableHead className="w-[100px]">金額</TableHead>
            <TableHead className="w-[150px]">類別</TableHead>
            <TableHead className="w-[150px]">帳戶</TableHead>
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
            const rowValid = isValid(tx);

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
                      {/* Mock categories for now - normally should fetch from context/hook */}
                      {Object.entries(SubType).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {value}
                        </SelectItem> // NOTE: In real app, value should be UUID
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    value={tx.transactionData.accountId || ''}
                    onValueChange={(val) =>
                      onUpdate(tx.id, {
                        transactionData: {
                          ...tx.transactionData,
                          accountId: val,
                        },
                      })
                    }
                  >
                    <SelectTrigger
                      className={cn(
                        'h-8',
                        !tx.transactionData.accountId && 'border-red-500',
                      )}
                    >
                      <SelectValue placeholder="選擇帳戶" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(Account).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {value}
                        </SelectItem> // NOTE: In real app, value should be UUID
                      ))}
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
  );
}
