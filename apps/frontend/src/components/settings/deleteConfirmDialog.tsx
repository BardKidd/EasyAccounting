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

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  categoryName: string;
  isMain?: boolean;
}

export function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  categoryName,
  isMain,
}: DeleteConfirmDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>確認刪除？</AlertDialogTitle>
          <AlertDialogDescription>
            您確定要刪除分類「{categoryName}」嗎？此動作無法復原。
            {isMain && (
              <span className="block mt-2 text-red-600 font-bold">
                如底下有其他子分類，將會連同其下的所有子分類一併刪除！
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} className="cursor-pointer">
            取消
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 text-white hover:bg-red-700 cursor-pointer"
          >
            刪除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
