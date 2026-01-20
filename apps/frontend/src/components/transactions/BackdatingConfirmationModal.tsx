'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

interface BackdatingConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  date: Date;
}

export function BackdatingConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  date,
}: BackdatingConfirmationModalProps) {
  const formattedDate = date.toLocaleDateString();

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            回溯補帳確認
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              您正在新增 <strong>{formattedDate}</strong> 的交易。
            </p>
            <p>
              此交易可能屬於已結束的預算週期，系統將重新計算從該日期起至今的所有週期。
            </p>
            <p className="font-semibold text-slate-900 dark:text-slate-200">
              確定要繼續嗎？
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>確認新增</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
