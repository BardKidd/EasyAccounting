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
              data.transactions.some((t: Transaction) => t.id === id)
            )
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
      {/* pb-24 for fixed footer */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">交易核對</h1>
          <p className="text-muted-foreground text-sm">
            帳單週期: {data.period.start} ~ {data.period.end}
          </p>
        </div>
      </div>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle>待核對交易列表</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-4 w-4" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>勾選出現在帳單上的交易。</p>
                    <p>未勾選的交易將自動延後至下一期。</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <span>說明</span>
            </div>
          </div>
          <CardDescription>
            請勾選出現在您信用卡帳單上的交易項目。未勾選的項目將自動延後至下個月結帳。
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={
                      data.transactions.length > 0 &&
                      selectedIds.size === data.transactions.length
                    }
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead>日期</TableHead>
                <TableHead>說明</TableHead>
                <TableHead>分類</TableHead>
                <TableHead className="text-right">金額</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.transactions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    此區間無待核對交易
                  </TableCell>
                </TableRow>
              ) : (
                data.transactions.map((txn) => (
                  <TableRow
                    key={txn.id}
                    className={selectedIds.has(txn.id) ? 'bg-muted/50' : ''}
                    onClick={() => toggleSelection(txn.id)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(txn.id)}
                        onCheckedChange={() => toggleSelection(txn.id)}
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(txn.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-medium">
                      {txn.description}
                    </TableCell>
                    <TableCell>
                      {txn.category ? (
                        <span className="flex items-center gap-2">
                          {/* Simple colored dot for category */}
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor: txn.category.color || '#ccc',
                            }}
                          ></span>
                          {txn.category.name}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
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
      <div className="fixed bottom-0 left-0 right-0 p-4 border-t bg-background/95 backdrop-blur z-10 md:pl-64">
        <div className="container max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex flex-col md:flex-row md:gap-8 gap-2">
            <div>
              <span className="text-sm text-muted-foreground">已選取:</span>
              <span className="ml-2 font-bold">
                {summary.selectedCount} / {summary.totalCount} 筆
              </span>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">總金額:</span>
              <span className="ml-2 font-bold text-primary">
                {formatCurrency(summary.selectedAmount)}
              </span>
              <span className="text-xs text-muted-foreground ml-2">
                (全選: {formatCurrency(summary.totalAmount)})
              </span>
            </div>
          </div>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || data.transactions.length === 0}
            size="lg"
          >
            {isSubmitting ? '處理中...' : '完成核對'}
          </Button>
        </div>
      </div>
    </div>
  );
}
