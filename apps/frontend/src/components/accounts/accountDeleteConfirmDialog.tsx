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
import { buttonVariants } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { AccountType, CreditAccountType } from '@repo/shared';
import services from '@/services';
import { useState } from 'react';
import { toast } from 'sonner';
import { getErrorMessage, cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface AccountDeleteConfirmDialogProps {
  isDeleteConfirmDialogOpen: boolean;
  setIsDeleteConfirmDialogOpen: (open: boolean) => void;
  account: AccountType | CreditAccountType | null;
}

function AccountDeleteConfirmDialog({
  isDeleteConfirmDialogOpen,
  setIsDeleteConfirmDialogOpen,
  account,
}: AccountDeleteConfirmDialogProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!account) return;

    try {
      setIsDeleting(true);
      const res = await services.deleteAccount(account.id);
      if (res.isSuccess) {
        toast.success(res.message);
        setIsDeleteConfirmDialogOpen(false);
      } else {
        toast.error(getErrorMessage(res.error));
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsDeleting(false);
      setIsDeleteConfirmDialogOpen(false);
      router.refresh();
    }
  };
  return (
    <AlertDialog
      open={isDeleteConfirmDialogOpen}
      onOpenChange={setIsDeleteConfirmDialogOpen}
    >
      <AlertDialogContent className="sm:max-w-[450px]">
        <AlertDialogHeader className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-6 w-6" />
            <AlertDialogTitle className="text-xl">
              確認刪除帳戶？
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-2">
              <span className="text-base text-foreground/80">
                您即將刪除帳戶{' '}
                <span className="font-bold text-foreground">
                  {account?.name}
                </span>
                。
              </span>

              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md w-full border border-destructive/20 mt-1">
                <p className="font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  警告：此動作無法復原！
                </p>
                <p className="mt-1 opacity-90">
                  刪除後，該帳戶的所有資料將永久遺失，請務必確認。
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-2">
          <AlertDialogCancel
            disabled={isDeleting}
            className={isDeleting ? 'cursor-not-allowed' : 'cursor-pointer'}
          >
            取消
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isDeleting}
            className={cn(
              buttonVariants({ variant: 'destructive' }),
              isDeleting ? 'cursor-not-allowed' : 'cursor-pointer'
            )}
          >
            {isDeleting ? '刪除中...' : '確認刪除'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default AccountDeleteConfirmDialog;
