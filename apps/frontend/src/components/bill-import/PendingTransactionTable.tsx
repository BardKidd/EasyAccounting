'use client';

import React, { useMemo, useCallback, useRef } from 'react';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  PendingTransaction,
  PendingTransactionStatus,
  CategoryType,
  AccountType,
  RootType,
} from '@repo/shared';
import { cn } from '@/lib/utils';
import { Link, AlertTriangle, MoreHorizontal, X } from 'lucide-react';
import { MergeDiscountDialog } from './MergeDiscountDialog';
import { useVirtualizer } from '@tanstack/react-virtual';

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
    typeof tx.transactionData.amount === 'number' &&
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

// 單列 Row Component，用 React.memo 避免不必要的 re-render
const TransactionRow = React.memo(
  ({
    tx,
    mainCategories,
    selectedAccountId,
    onUpdate,
    onOpenMergeDialog,
  }: {
    tx: PendingTransaction;
    mainCategories: CategoryType[];
    selectedAccountId: string;
    onUpdate: (id: string, updates: Partial<PendingTransaction>) => void;
    onOpenMergeDialog: (tx: PendingTransaction) => void;
  }) => {
    const isSkipped = tx.status === PendingTransactionStatus.SKIPPED;
    const isConfirmed = tx.status === PendingTransactionStatus.CONFIRMED;
    const hasMatch = !!tx.matchedTransactionId;
    const rowValid = isValid(tx, selectedAccountId);

    return (
      <TableRow
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
            className="h-8 bg-transparent border-transparent hover:border-slate-200 dark:hover:border-slate-800 focus:bg-background focus:border-ring transition-colors cursor-pointer w-[130px]"
          />
        </TableCell>
        <TableCell>
          <Input
            type="time"
            step="1"
            defaultValue={tx.transactionData.time || ''}
            onBlur={(e) => {
              if (e.target.value !== (tx.transactionData.time || '')) {
                onUpdate(tx.id, {
                  transactionData: {
                    ...tx.transactionData,
                    time: e.target.value || null,
                  },
                });
              }
            }}
            className="h-8 bg-transparent border-transparent hover:border-slate-200 dark:hover:border-slate-800 focus:bg-background focus:border-ring transition-colors cursor-pointer w-[120px]"
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
            className="h-8 bg-transparent border-transparent hover:border-slate-200 dark:hover:border-slate-800 focus:bg-background focus:border-ring transition-colors w-full"
            placeholder="請輸入商家/描述"
          />
        </TableCell>
        <TableCell>
          <div className="flex flex-col gap-1 items-start justify-center">
            <div className="flex items-center gap-2 w-full">
              <button
                onClick={() =>
                  onUpdate(tx.id, {
                    transactionData: {
                      ...tx.transactionData,
                      type:
                        tx.transactionData.type === 'expense'
                          ? 'income'
                          : 'expense',
                    },
                  })
                }
                className={cn(
                  'text-[10px] font-medium px-2 py-0.5 rounded cursor-pointer transition-all duration-200 shrink-0 select-none',
                  tx.transactionData.type === 'income'
                    ? 'bg-emerald-100/80 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/20 ring-1 ring-inset ring-emerald-500/20 dark:ring-emerald-500/30'
                    : 'bg-red-100/80 text-red-700 dark:bg-red-500/10 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/20 ring-1 ring-inset ring-red-500/20 dark:ring-red-500/30',
                )}
                title="點擊切換支出/收入"
              >
                {tx.transactionData.type === 'income' ? '收入' : '支出'}
              </button>
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
                className="h-8 bg-transparent border-transparent hover:border-slate-200 dark:hover:border-slate-800 focus:bg-background focus:border-ring transition-colors font-medium w-[100px]"
              />
            </div>
            {(!!tx.transactionData.extraAdd ||
              !!tx.transactionData.extraMinus) && (
              <div className="flex flex-col pl-1 pr-2 gap-1 w-full border-t border-dashed border-slate-200 dark:border-slate-800 pt-1 mt-0.5">
                {!!tx.transactionData.extraAdd &&
                  tx.transactionData.extraAdd > 0 && (
                    <div className="flex items-center justify-between group/extra">
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        折扣 -{tx.transactionData.extraAdd}
                      </span>
                      <button
                        onClick={() =>
                          onUpdate(tx.id, {
                            transactionData: {
                              ...tx.transactionData,
                              extraAdd: 0,
                            },
                          })
                        }
                        className="h-4 w-4 rounded-full flex items-center justify-center opacity-0 group-hover/extra:opacity-100 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-all duration-200 cursor-pointer"
                        title="移除折扣"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                {!!tx.transactionData.extraMinus &&
                  tx.transactionData.extraMinus > 0 && (
                    <div className="flex items-center justify-between group/extra">
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                        手續費 +{tx.transactionData.extraMinus}
                      </span>
                      <button
                        onClick={() =>
                          onUpdate(tx.id, {
                            transactionData: {
                              ...tx.transactionData,
                              extraMinus: 0,
                            },
                          })
                        }
                        className="h-4 w-4 rounded-full flex items-center justify-center opacity-0 group-hover/extra:opacity-100 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 transition-all duration-200 cursor-pointer"
                        title="移除手續費"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
              </div>
            )}
          </div>
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
                'h-8 bg-transparent border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-colors w-[140px]',
                !tx.transactionData.categoryId &&
                  'border-red-300 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10 text-red-600 dark:text-red-400 hover:border-red-400 dark:hover:border-red-800',
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
              {tx.installmentNumber ? `第 ${tx.installmentNumber} 期` : '分期'}
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
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground transition-colors">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onOpenMergeDialog(tx)}>
                作為折扣/手續費合併
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    );
  },
);
TransactionRow.displayName = 'TransactionRow';

const ROW_HEIGHT = 52; // 每列預估高度 (px)

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

  const [mergeDialogOpen, setMergeDialogOpen] = React.useState(false);
  const [mergeSourceTx, setMergeSourceTx] =
    React.useState<PendingTransaction | null>(null);

  const handleOpenMergeDialog = useCallback((tx: PendingTransaction) => {
    setMergeSourceTx(tx);
    setMergeDialogOpen(true);
  }, []);

  const handleMerge = useCallback(
    (
      sourceId: string,
      targetId: string,
      actionType: 'extraAdd' | 'extraMinus',
    ) => {
      const sourceTx = transactions.find((t) => t.id === sourceId);
      const targetTx = transactions.find((t) => t.id === targetId);
      if (!sourceTx || !targetTx) return;

      const amountVal = Math.abs(Number(sourceTx.transactionData.amount) || 0);
      const currentExtra = Number(targetTx.transactionData[actionType]) || 0;

      onUpdate(targetId, {
        transactionData: {
          ...targetTx.transactionData,
          [actionType]: currentExtra + amountVal,
        },
      });

      onUpdate(sourceId, {
        status: PendingTransactionStatus.SKIPPED,
      });
    },
    [transactions, onUpdate],
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

  // Virtualizer — spacer row 方式保持原生 table layout
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: sortedTransactions.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const virtualItems = virtualizer.getVirtualItems();

  // 上下 spacer 高度，讓滾動條正確反映總高度
  const paddingTop = virtualItems.length > 0 ? virtualItems[0]!.start : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1]!.end
      : 0;

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

      {/* Virtualized Table */}
      <div
        ref={scrollContainerRef}
        className="rounded-md border overflow-auto"
        style={{ maxHeight: '65vh' }}
      >
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead className="w-[50px] text-center">匯入</TableHead>
              <TableHead className="w-[120px]">日期</TableHead>
              <TableHead className="w-[80px]">時間</TableHead>
              <TableHead className="w-[200px]">商家/描述</TableHead>
              <TableHead className="w-[100px]">金額</TableHead>
              <TableHead className="w-[150px]">類別</TableHead>
              <TableHead className="w-[100px]">分期</TableHead>
              <TableHead className="w-[100px]">狀態</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Top spacer */}
            {paddingTop > 0 && (
              <tr>
                <td
                  colSpan={9}
                  style={{ height: paddingTop, padding: 0, border: 'none' }}
                />
              </tr>
            )}

            {/* Visible rows */}
            {virtualItems.map((virtualRow) => {
              const tx = sortedTransactions[virtualRow.index]!;
              return (
                <TransactionRow
                  key={tx.id}
                  tx={tx}
                  mainCategories={mainCategories}
                  selectedAccountId={selectedAccountId}
                  onUpdate={onUpdate}
                  onOpenMergeDialog={handleOpenMergeDialog}
                />
              );
            })}

            {/* Bottom spacer */}
            {paddingBottom > 0 && (
              <tr>
                <td
                  colSpan={9}
                  style={{ height: paddingBottom, padding: 0, border: 'none' }}
                />
              </tr>
            )}
          </TableBody>
        </Table>
      </div>

      <MergeDiscountDialog
        open={mergeDialogOpen}
        onOpenChange={setMergeDialogOpen}
        sourceTransaction={mergeSourceTx}
        targetTransactions={transactions}
        onMerge={handleMerge}
      />
    </div>
  );
}
