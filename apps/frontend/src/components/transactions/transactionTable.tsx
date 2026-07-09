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
  TagType,
} from '@repo/shared';
import CustomPagination from '@/components/customPagination';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowRightLeft,
  Trash2,
  Tag as TagIcon,
  X,
  Loader2,
} from 'lucide-react';
import { ACCOUNT_ICONS, IconName } from '@/lib/icon-mapping';
import { CategoryIcon } from '@/components/ui/category-icon';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { getTags } from '@/services/tagService';
import services from '@/services';
import { calculateNetAmount, formatCurrency, cn } from '@/lib/utils';

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
  const router = useRouter();
  const items = transactions?.items ?? [];
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [tags, setTags] = useState<TagType[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);

  // 換頁 / 篩選導致清單改變時清空選取
  useEffect(() => {
    setSelectedIds(new Set());
  }, [transactions]);

  useEffect(() => {
    let active = true;
    getTags()
      .then((d) => {
        if (active) setTags(d || []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(items.map((i) => i.id!)));
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runBatchDelete = async () => {
    if (!selectedIds.size) return;
    try {
      setIsBusy(true);
      const res = await services.batchTransactions({
        ids: Array.from(selectedIds),
        action: 'delete',
      });
      toast.success(`已刪除 ${res?.data?.affected ?? 0} 筆交易`);
      setSelectedIds(new Set());
      router.refresh();
    } catch {
      toast.error('批次刪除失敗');
    } finally {
      setIsBusy(false);
    }
  };

  const runAddTag = async (tagId: string) => {
    if (!selectedIds.size) return;
    try {
      setIsBusy(true);
      const res = await services.batchTransactions({
        ids: Array.from(selectedIds),
        action: 'addTags',
        tagIds: [tagId],
      });
      toast.success(`已為 ${res?.data?.affected ?? 0} 筆交易加上標籤`);
      setTagPopoverOpen(false);
      setSelectedIds(new Set());
      router.refresh();
    } catch {
      toast.error('批次加標籤失敗');
    } finally {
      setIsBusy(false);
    }
  };

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
        <span className="text-amber-600 dark:text-amber-400 font-bold font-mono tracking-tight">
          {formatted}
        </span>
      );
    }

    if (netAmount === 0) {
      return (
        <span className="text-teal-600 dark:text-teal-400 font-bold font-mono tracking-tight">
          {formatted}
        </span>
      );
    }

    if (item.type === RootType.EXPENSE) {
      return (
        <span className="text-rose-600 dark:text-rose-400 font-bold font-mono tracking-tight">
          -{formatted}
        </span>
      );
    }
    if (item.type === RootType.INCOME) {
      return (
        <span className="text-teal-600 dark:text-teal-400 font-bold font-mono tracking-tight">
          +{formatted}
        </span>
      );
    }
    return (
      <span className="text-slate-600 dark:text-slate-300 font-bold font-mono tracking-tight">
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
        <h3 className="text-lg font-bold text-foreground">尚無交易紀錄</h3>
        <p className="text-sm text-muted-foreground mt-2">
          試著新增一筆交易或調整篩選條件
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200/60 dark:border-emerald-500/20 bg-emerald-50/70 dark:bg-emerald-500/10 px-4 py-2.5 backdrop-blur-md">
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            已選取 {selectedIds.size} 筆
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isBusy}
                  className="h-8 gap-1.5"
                >
                  <TagIcon className="h-3.5 w-3.5" /> 加標籤
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="end">
                {tags.length === 0 ? (
                  <div className="text-sm text-slate-400 px-2 py-3">
                    尚無標籤
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-0.5">
                    {tags.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        disabled={isBusy}
                        onClick={() => runAddTag(t.id)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: t.color }}
                        />
                        <span className="flex-1 text-left truncate">
                          {t.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </PopoverContent>
            </Popover>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isBusy}
                  className="h-8 gap-1.5 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                >
                  {isBusy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}{' '}
                  刪除
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    刪除 {selectedIds.size} 筆交易？
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    此操作會刪除選取的交易（轉帳會一併沖銷對應帳戶餘額），無法復原。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={runBatchDelete}
                    className="bg-rose-600 hover:bg-rose-700"
                  >
                    確認刪除
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => setSelectedIds(new Set())}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
      <Card className="rounded-3xl bg-white/60 dark:bg-[#0f172a]/60 backdrop-blur-2xl border-slate-200/50 dark:border-white/10 shadow-xl overflow-hidden transition-all duration-300">
        <div className="rounded-md">
          <Table data-testid="transaction-table">
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-slate-200/50 dark:border-white/10 bg-slate-50/50 dark:bg-white/5">
                <TableHead className="w-[44px]">
                  <Checkbox
                    checked={
                      allSelected
                        ? true
                        : someSelected
                          ? 'indeterminate'
                          : false
                    }
                    onCheckedChange={toggleAll}
                    aria-label="全選"
                  />
                </TableHead>
                <TableHead className="w-[120px] text-slate-500 dark:text-slate-400">
                  日期
                </TableHead>
                <TableHead className="w-[100px] text-slate-500 dark:text-slate-400">
                  類型
                </TableHead>
                <TableHead className="w-[200px] text-slate-500 dark:text-slate-400">
                  分類
                </TableHead>
                <TableHead className="w-[200px] text-slate-500 dark:text-slate-400">
                  帳戶
                </TableHead>
                <TableHead className="text-slate-500 dark:text-slate-400">
                  備註
                </TableHead>
                <TableHead className="text-right w-[150px] text-slate-500 dark:text-slate-400">
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
                    className={cn(
                      'hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors border-b border-slate-100 dark:border-slate-800/50 last:border-0',
                      selectedIds.has(transaction.id!) &&
                        'bg-emerald-50/50 dark:bg-emerald-500/5',
                    )}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(transaction.id!)}
                        onCheckedChange={() => toggleOne(transaction.id!)}
                        aria-label="選取交易"
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm text-foreground">
                      <div>
                        {format(new Date(transaction.date), 'yyyy-MM-dd')}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
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
                            !category?.color ? 'bg-muted' : ''
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
                        {(transaction as any).isSplit &&
                          transaction.splits &&
                          transaction.splits.length > 0 && (
                            <span className="ml-1 inline-flex items-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300 px-1.5 py-0.5 text-[10px] font-medium">
                              拆分 {transaction.splits.length}
                            </span>
                          )}
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
                                <span className="text-slate-500 dark:text-slate-400">
                                  未知帳戶
                                </span>
                              );
                            const Icon =
                              ACCOUNT_ICONS[account.icon as IconName];
                            return (
                              <>
                                {Icon && (
                                  <Icon className="h-4 w-4 text-slate-400" />
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
                          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 pl-2 border-l-2 border-slate-200 dark:border-slate-700">
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
                      <div className="flex items-center gap-2">
                        {transaction.recurringTemplateId && (
                          <div
                            className="flex items-center justify-center bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 rounded px-1.5 py-0.5 text-[10px] font-bold shrink-0"
                            title="週期性交易"
                          >
                            <span className="mr-1">🔁</span>
                            {transaction.recurringSequence !== null &&
                            transaction.recurringSequence !== undefined
                              ? transaction.recurringSequence
                              : ''}
                          </div>
                        )}
                        <span
                          className="text-sm text-slate-500 dark:text-slate-400 truncate block"
                          title={transaction.description || ''}
                        >
                          {transaction.description || '-'}
                        </span>
                      </div>
                      {transaction.tags && transaction.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {transaction.tags.map((t) => (
                            <span
                              key={t.id}
                              className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium"
                              style={{ borderColor: t.color, color: t.color }}
                            >
                              <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: t.color }}
                              />
                              {t.name}
                            </span>
                          ))}
                        </div>
                      )}
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
