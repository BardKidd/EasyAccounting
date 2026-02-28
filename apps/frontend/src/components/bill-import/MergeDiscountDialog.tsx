import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PendingTransaction } from '@repo/shared';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface MergeDiscountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceTransaction: PendingTransaction | null;
  targetTransactions: PendingTransaction[];
  onMerge: (
    sourceId: string,
    targetId: string,
    actionType: 'extraAdd' | 'extraMinus',
  ) => void;
}

export function MergeDiscountDialog({
  open,
  onOpenChange,
  sourceTransaction,
  targetTransactions,
  onMerge,
}: MergeDiscountDialogProps) {
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [actionType, setActionType] = useState<'extraAdd' | 'extraMinus'>(
    'extraAdd',
  );

  if (!sourceTransaction) return null;

  const handleConfirm = () => {
    if (!selectedTargetId) return;
    onMerge(sourceTransaction.id, selectedTargetId, actionType);
    onOpenChange(false);
    setSelectedTargetId('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border-slate-200/50 dark:border-white/10 rounded-3xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold font-playfair bg-linear-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
            作為折扣/費用合併
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
            將此筆明細的金額（
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {sourceTransaction.transactionData.amount}
            </span>
            ）合併到另一筆消費的折扣或手續費中，系統將把此筆明細標記為略過。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>要合併入的消費</Label>
            <Select
              value={selectedTargetId}
              onValueChange={setSelectedTargetId}
            >
              <SelectTrigger>
                <SelectValue placeholder="選擇一筆消費" />
              </SelectTrigger>
              <SelectContent>
                {targetTransactions
                  .filter((tx) => tx.id !== sourceTransaction.id)
                  .map((tx) => (
                    <SelectItem key={tx.id} value={tx.id}>
                      {tx.transactionData.date} -{' '}
                      {tx.transactionData.description} (
                      {tx.transactionData.amount})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>合併方式</Label>
            <RadioGroup
              value={actionType}
              onValueChange={(val: string) =>
                setActionType(val as 'extraAdd' | 'extraMinus')
              }
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="extraAdd" id="r1" />
                <Label htmlFor="r1" className="font-normal">
                  作為折扣 (-金額)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="extraMinus" id="r2" />
                <Label htmlFor="r2" className="font-normal">
                  作為手續費 (+金額)
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl font-medium border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedTargetId}
            className="rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:-translate-y-0.5"
          >
            確認合併
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
