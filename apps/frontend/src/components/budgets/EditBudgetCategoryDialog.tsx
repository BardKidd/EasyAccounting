'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { CategoryType } from '@repo/shared';

interface EditBudgetCategoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number, isExcluded: boolean) => Promise<void>;
  category: CategoryType | undefined;
  currentAmount: number;
  currentIsExcluded: boolean;
  maxAmount: number;
}

export function EditBudgetCategoryDialog({
  isOpen,
  onClose,
  onConfirm,
  category,
  currentAmount,
  currentIsExcluded,
  maxAmount,
}: EditBudgetCategoryDialogProps) {
  const [amount, setAmount] = useState<string>('');
  const [isExcluded, setIsExcluded] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmount(currentAmount.toString());
      setIsExcluded(currentIsExcluded);
    }
  }, [isOpen, currentAmount, currentIsExcluded]);

  const handleConfirm = async () => {
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      toast.error('請輸入有效的金額');
      return;
    }

    if (numAmount > maxAmount) {
      toast.error(`金額不能超過總預算剩餘額度 (${formatCurrency(maxAmount)})`);
      return;
    }

    setLoading(true);
    try {
      await onConfirm(numAmount, isExcluded);
      onClose();
    } catch (error) {
      toast.error('更新失敗');
    } finally {
      setLoading(false);
    }
  };

  if (!category) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>編輯子預算</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label>分類名稱</Label>
            <div className="font-medium text-lg flex items-center gap-2">
              {category.name}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="flex justify-between items-center">
              <Label>配額金額</Label>
              <span className="text-sm text-muted-foreground">
                可分配上限: {formatCurrency(maxAmount)}
              </span>
            </div>

            <div className="flex gap-4 items-center">
              <Slider
                max={maxAmount}
                step={100}
                value={[Number(amount) || 0]}
                onValueChange={(val) => setAmount(val[0].toString())}
                className="flex-1"
              />
              <Input
                type="number"
                value={amount}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val > maxAmount) return;
                  setAmount(e.target.value);
                }}
                className="w-24 text-right"
                placeholder="0"
                min={0}
                max={maxAmount}
              />
            </div>
          </div>

          <div className="flex items-center justify-between space-x-2 border rounded-lg p-4 bg-muted/30">
            <div className="space-y-0.5">
              <Label className="text-base">隱藏子預算 (Exclude)</Label>
              <div className="text-sm text-muted-foreground">
                啟用後，此項目的使用率將不計入總預算統計
              </div>
            </div>
            <Switch checked={isExcluded} onCheckedChange={setIsExcluded} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={!amount || loading}>
            {loading ? '更新中...' : '更新'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
