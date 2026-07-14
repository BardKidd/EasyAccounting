'use client';

import { useEffect, useState, useMemo } from 'react';
import { getErrorMessage, formatCurrency, cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { ArrowLeft, HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  confirmReconciliation,
  ReconciliationData,
  Transaction,
} from '@/services/reconciliationService';

interface Props {
  data: ReconciliationData;
  accountId: string;
}

export default function ReconciliationDetailClient({ data, accountId }: Props) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load persistence state key
  const storageKey = `reconciliation_state_${accountId}`;

  useEffect(() => {
    // Restore selection from localStorage if available
    const savedState = localStorage.getItem(storageKey);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (Array.isArray(parsed)) {
          // Only restore IDs that are actually in the fetched transactions
          const validIds = new Set(
            parsed.filter((id) =>
              data.transactions.some((t: Transaction) => t.id === id),
            ),
          );
          setSelectedIds(validIds);
        }
      } catch (e) {
        console.error('Failed to parse saved state', e);
      }
    }
  }, [data, storageKey]);

  // Save to persistence whenever selection changes
  useEffect(() => {
    if (data) {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(selectedIds)));
    }
  }, [selectedIds, data, storageKey]);

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
    if (!data) return;
    if (selectedIds.size === data.transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.transactions.map((t) => t.id)));
    }
  };

  const handleConfirm = async () => {
    if (!data) return;

    // Logic: Selected -> Confirm, Unselected -> Defer
    const confirmedTransactionIds = Array.from(selectedIds);
    const deferredTransactionIds = data.transactions
      .filter((t) => !selectedIds.has(t.id))
      .map((t) => t.id);

    // Confirmation Dialog could be added here
    const confirmMsg = `您選擇核對 ${confirmedTransactionIds.length} 筆交易，並將剩餘 ${deferredTransactionIds.length} 筆交易延後至下一期。確定嗎？`;
    if (!window.confirm(confirmMsg)) return;

    setIsSubmitting(true);
    try {
      const res = await confirmReconciliation(accountId, {
        confirmedTransactionIds,
        deferredTransactionIds,
      });

      if (res.isSuccess) {
        toast.success('核對完成！');
        localStorage.removeItem(storageKey); // Clear saved state
        router.push('/reconciliation');
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculations for summary
  const summary = useMemo(() => {
    if (!data)
      return {
        selectedCount: 0,
        selectedAmount: 0,
        totalCount: 0,
        totalAmount: 0,
      };
    let selectedAmount = 0;
    let totalAmount = 0;

    data.transactions.forEach((t) => {
      const amt = Number(t.amount);
      totalAmount += amt;
      if (selectedIds.has(t.id)) {
        selectedAmount += amt;
      }
    });

    return {
      selectedCount: selectedIds.size,
      selectedAmount,
      totalCount: data.transactions.length,
      totalAmount,
    };
  }, [data, selectedIds]);

  return (
    <div className="space-y-6 pb-40 md:pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold bg-linear-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent font-outfit uppercase">
            交易核對
          </h1>
          <p className="text-muted-foreground text-sm font-sans">
            帳單週期: {data.period.start} ~ {data.period.end}
          </p>
        </div>
      </div>

      <Card className="shadow-xl bg-white/60 dark:bg-[#0f172a]/60 backdrop-blur-2xl border-slate-200/50 dark:border-white/10 rounded-3xl overflow-hidden">
        <CardHeader className="pb-4 border-b border-slate-200/50 dark:border-white/5">
          <div className="flex items-center justify-between">
            <CardTitle className="font-outfit text-xl">
              待核對交易列表
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-2 text-muted-foreground hover:text-foreground"
                    >
                      <HelpCircle className="h-4 w-4" />
                      <span>說明</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>勾選出現在帳單上的交易。</p>
                    <p>未勾選的交易將自動延後至下一期。</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <CardDescription>
            請勾選出現在您信用卡帳單上的交易項目。未勾選的項目將自動延後至下個月結帳。
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* 桌面：表格（維持原樣） */}
          <div className="hidden md:block">
          <Table>
            <TableHeader className="bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-sm">
              <TableRow className="hover:bg-transparent border-slate-200/50 dark:border-white/5">
                <TableHead className="w-[50px] pl-6">
                  <Checkbox
                    checked={
                      data.transactions.length > 0 &&
                      selectedIds.size === data.transactions.length
                    }
                    onCheckedChange={toggleAll}
                    className="border-slate-300 dark:border-slate-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 rounded flex w-4 h-4"
                  />
                </TableHead>
                <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                  日期
                </TableHead>
                <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                  說明
                </TableHead>
                <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                  分類
                </TableHead>
                <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300 pr-6">
                  金額
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.transactions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-12 text-muted-foreground bg-slate-50/10 dark:bg-slate-900/10"
                  >
                    此區間無待核對交易
                  </TableCell>
                </TableRow>
              ) : (
                data.transactions.map((txn) => (
                  <TableRow
                    key={txn.id}
                    className={`
                      cursor-pointer transition-all duration-300 border-b border-slate-100/50 dark:border-white/5
                      ${
                        selectedIds.has(txn.id)
                          ? 'bg-emerald-50/50 hover:bg-emerald-50/80 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/30'
                      }
                    `}
                    onClick={() => toggleSelection(txn.id)}
                  >
                    <TableCell
                      onClick={(e) => e.stopPropagation()}
                      className="pl-6"
                    >
                      <Checkbox
                        checked={selectedIds.has(txn.id)}
                        onCheckedChange={() => toggleSelection(txn.id)}
                        className="border-slate-300 dark:border-slate-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 rounded flex w-4 h-4"
                      />
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400">
                      {new Date(txn.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900 dark:text-slate-200">
                      {txn.description}
                    </TableCell>
                    <TableCell>
                      {txn.category ? (
                        <span className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 shadow-sm"
                            style={{
                              backgroundColor: txn.category.color || '#ccc',
                            }}
                          ></span>
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {txn.category.name}
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-base font-semibold text-slate-700 dark:text-slate-300 pr-6">
                      {formatCurrency(Number(txn.amount))}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>

          {/* 手機：全選列 + 可點 card 列（金額與日期/分類同屏、無橫向捲動） */}
          <div className="md:hidden">
            {data.transactions.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                此區間無待核對交易
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100/50 dark:border-white/5">
                  <span className="text-xs text-muted-foreground">
                    共 {data.transactions.length} 筆
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9"
                    onClick={toggleAll}
                  >
                    {selectedIds.size === data.transactions.length
                      ? '取消全選'
                      : '全選'}
                  </Button>
                </div>
                <div className="space-y-2 p-4">
                  {data.transactions.map((txn) => {
                    const selected = selectedIds.has(txn.id);
                    return (
                      <button
                        key={txn.id}
                        type="button"
                        onClick={() => toggleSelection(txn.id)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors active:bg-accent',
                          selected
                            ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-500/40 dark:bg-emerald-500/10'
                            : 'border-slate-200 bg-card dark:border-slate-800',
                        )}
                      >
                        <Checkbox
                          checked={selected}
                          aria-label="選取交易"
                          className="pointer-events-none shrink-0 border-slate-300 dark:border-slate-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 rounded flex w-4 h-4"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                              {txn.description}
                            </span>
                            <span className="shrink-0 font-mono text-base font-semibold text-slate-700 dark:text-slate-300">
                              {formatCurrency(Number(txn.amount))}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="shrink-0">
                              {new Date(txn.date).toLocaleDateString()}
                            </span>
                            {txn.category ? (
                              <>
                                <span
                                  className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white dark:ring-slate-900 shadow-sm"
                                  style={{
                                    backgroundColor: txn.category.color || '#ccc',
                                  }}
                                />
                                <span className="truncate">
                                  {txn.category.name}
                                </span>
                              </>
                            ) : (
                              <span>-</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Footer Summary Bar */}
      <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-0 left-0 right-0 p-4 border-t border-slate-200/50 dark:border-white/10 bg-white/70 dark:bg-[#060c15]/70 backdrop-blur-2xl z-10 md:pl-64 transition-all duration-300 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
        <div className="container max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex flex-col md:flex-row md:gap-12 gap-2">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                已選取
              </span>
              <span className="text-xl font-bold font-outfit text-slate-900 dark:text-white">
                {summary.selectedCount}
                <span className="text-base font-normal text-slate-400 font-sans ml-1">
                  / {summary.totalCount} 筆
                </span>
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                總金額
              </span>
              <span className="text-xl font-bold font-outfit text-emerald-600 dark:text-emerald-400">
                {formatCurrency(summary.selectedAmount)}
              </span>
              <span className="text-xs text-slate-400 font-mono ml-1">
                (全選: {formatCurrency(summary.totalAmount)})
              </span>
            </div>
          </div>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || data.transactions.length === 0}
            size="lg"
            className="shadow-xl hover:-translate-y-0.5 transition-all duration-300 bg-emerald-500 hover:bg-emerald-400 text-white min-w-[120px] rounded-xl font-medium"
          >
            {isSubmitting ? '處理中...' : '完成核對'}
          </Button>
        </div>
      </div>
    </div>
  );
}
