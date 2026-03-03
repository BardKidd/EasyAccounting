'use client';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface RecurringEditDialogProps {
  isOpen: boolean;
  mode: 'edit' | 'delete';
  onSelectSingle: () => void;
  onSelectAll: () => void;
  onClose: () => void;
  isLoading?: boolean;
}

export function RecurringEditDialog({
  isOpen,
  mode,
  onSelectSingle,
  onSelectAll,
  onClose,
  isLoading = false,
}: RecurringEditDialogProps) {
  const isDelete = mode === 'delete';

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isDelete ? '刪除週期性交易' : '修改週期性交易'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            這是一筆週期性交易，請選擇{isDelete ? '刪除' : '修改'}範圍：
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-2 py-2">
          <Button
            variant="outline"
            onClick={onSelectSingle}
            disabled={isLoading}
            className="justify-start"
          >
            僅此筆
          </Button>
          <Button
            variant="destructive"
            onClick={onSelectAll}
            disabled={isLoading}
            className="justify-start"
          >
            {isDelete ? '刪除此筆及所有後續週期' : '修改此筆及所有後續週期'}
          </Button>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={isLoading}>
            取消
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
