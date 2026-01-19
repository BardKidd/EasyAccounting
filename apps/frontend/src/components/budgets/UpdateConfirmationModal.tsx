'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { formatCurrency } from '@/lib/utils';

interface UpdateConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (choice: 'immediate' | 'nextPeriod') => void;
  oldAmount: number;
  newAmount: number;
}

export function UpdateConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  oldAmount,
  newAmount,
}: UpdateConfirmationModalProps) {
  const [choice, setChoice] = useState<'immediate' | 'nextPeriod'>('nextPeriod');

  const handleConfirm = () => {
    onConfirm(choice);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>預算額度變更確認</DialogTitle>
          <DialogDescription>
            您正在修改預算額度，請選擇生效時間。
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="mb-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">原額度：</span>
              <span>{formatCurrency(oldAmount)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>新額度：</span>
              <span>{formatCurrency(newAmount)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
             <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setChoice('immediate')}>
                <input type="radio" id="immediate" name="effective" value="immediate" checked={choice === 'immediate'} onChange={() => setChoice('immediate')} className="h-4 w-4 accent-primary" />
                <Label htmlFor="immediate" className="cursor-pointer">立即生效 (重新計算當前週期)</Label>
             </div>
             <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setChoice('nextPeriod')}>
                <input type="radio" id="nextPeriod" name="effective" value="nextPeriod" checked={choice === 'nextPeriod'} onChange={() => setChoice('nextPeriod')} className="h-4 w-4 accent-primary" />
                <Label htmlFor="nextPeriod" className="cursor-pointer">下期生效 (當前週期維持不變)</Label>
             </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleConfirm}>確認變更</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}