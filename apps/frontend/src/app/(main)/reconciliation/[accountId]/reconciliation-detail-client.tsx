'use client';

import { useEffect, useState, useMemo } from 'react';
import { getErrorMessage, formatCurrency } from '@/lib/utils';
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
    <div className="space-y-6 pb-24">
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
          <h1 className="text-2xl font-bold bg-linear-to-r from-slate-900 to-slate-700 dark:from-white dark:to-white/60 bg-clip-text text-transparent font-playfair">
            交易核對
          </h1>
          <p className="text-muted-foreground text-sm font-sans">
            帳單週期: {data.period.start} ~ {data.period.end}
          </p>
        </div>
      </div>

      <Card className="border-slate-200/60 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl shadow-sm overflow-hidden">
        <CardHeader className="pb-4 border-b border-slate-100/50 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-900/30">
          <div className="flex items-center justify-between">
            <CardTitle className="font-playfair text-xl">
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
          <Table>
            <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
              <TableRow className="hover:bg-transparent border-slate-100 dark:border-slate-800">
                <TableHead className="w-[50px] pl-6">
                  <Checkbox
                    checked={
                      data.transactions.length > 0 &&
                      selectedIds.size === data.transactions.length
                    }
                    onCheckedChange={toggleAll}
                    className="border-slate-300 dark:border-slate-600 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
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
                      cursor-pointer transition-colors duration-200 border-slate-100 dark:border-slate-800
                      ${
                        selectedIds.has(txn.id)
                          ? 'bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/20'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
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
                        className="border-slate-300 dark:border-slate-600 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
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
        </CardContent>
      </Card>

      {/* Footer Summary Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 border-t border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl z-10 md:pl-64 transition-all duration-300">
        <div className="container max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex flex-col md:flex-row md:gap-12 gap-2">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                已選取
              </span>
              <span className="text-xl font-bold font-playfair text-slate-900 dark:text-white">
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
              <span className="text-xl font-bold font-playfair text-primary">
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
            className="shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 bg-primary hover:bg-primary/90 min-w-[120px]"
          >
            {isSubmitting ? '處理中...' : '完成核對'}
          </Button>
        </div>
      </div>
    </div>
  );
}
