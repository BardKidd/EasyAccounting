'use client';

import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CategoryType } from '@repo/shared';
import { toast } from 'sonner';

interface AddBudgetCategoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (categoryId: number, amount: number) => Promise<void>;
  categories: CategoryType[];
  existingCategoryIds: number[];
}

export function AddBudgetCategoryDialog({
  isOpen,
  onClose,
  onConfirm,
  categories,
  existingCategoryIds,
}: AddBudgetCategoryDialogProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // 過濾可用的分類：
  // 1. 排除已經添加到預算中的分類 (防止重複)
  // 2. 僅顯示主分類 (目前假設沒有 parentId 的為主分類，具體需視資料結構而定)
  const availableCategories = categories.filter(
    (c) => !existingCategoryIds.includes(Number(c.id)) && !c.parentId, // Only show main categories
  );

  const handleConfirm = async () => {
    if (!selectedCategoryId || !amount) return;

    setLoading(true);
    try {
      await onConfirm(Number(selectedCategoryId), Number(amount));
      onClose();
      setSelectedCategoryId('');
      setAmount('');
    } catch (error) {
      toast.error('新增失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新增子預算 (分類配額)</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>主分類</Label>
            <Select
              value={selectedCategoryId}
              onValueChange={setSelectedCategoryId}
            >
              <SelectTrigger>
                <SelectValue placeholder="選擇主分類..." />
              </SelectTrigger>
              <SelectContent>
                {availableCategories.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    無可用分類
                  </div>
                ) : (
                  availableCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      <div className="flex items-center gap-2">
                        <span>{cat.icon}</span>{' '}
                        {/* Render icon properly if it's a component or string */}
                        <span>{cat.name}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>配額金額</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="輸入金額"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedCategoryId || !amount || loading}
          >
            {loading ? '新增中...' : '新增'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
