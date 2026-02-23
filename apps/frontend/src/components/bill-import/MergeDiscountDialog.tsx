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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>作為折扣/費用合併</DialogTitle>
          <DialogDescription>
            將此筆明細的金額（{sourceTransaction.transactionData.amount}
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedTargetId}
            className="bg-teal-500 hover:bg-teal-600 text-white"
          >
            確認合併
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
