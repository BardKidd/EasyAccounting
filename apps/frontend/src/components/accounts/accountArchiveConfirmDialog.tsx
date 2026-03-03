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
import { Archive } from 'lucide-react';
import { AccountType, CreditAccountType } from '@repo/shared';
import services from '@/services';
import { useState } from 'react';
import { toast } from 'sonner';
import { getErrorMessage, cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface AccountArchiveConfirmDialogProps {
  isArchiveConfirmDialogOpen: boolean;
  setIsArchiveConfirmDialogOpen: (open: boolean) => void;
  account: AccountType | CreditAccountType | null;
}

function AccountArchiveConfirmDialog({
  isArchiveConfirmDialogOpen,
  setIsArchiveConfirmDialogOpen,
  account,
}: AccountArchiveConfirmDialogProps) {
  const router = useRouter();
  const [isArchiving, setIsArchiving] = useState(false);

  const handleArchive = async () => {
    if (!account) return;

    try {
      setIsArchiving(true);
      const res = await services.archiveAccount(account.id);
      if (res.isSuccess) {
        toast.success(res.message);
        setIsArchiveConfirmDialogOpen(false);
      } else {
        toast.error(getErrorMessage(res.error));
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsArchiving(false);
      setIsArchiveConfirmDialogOpen(false);
      router.refresh();
    }
  };

  return (
    <AlertDialog
      open={isArchiveConfirmDialogOpen}
      onOpenChange={setIsArchiveConfirmDialogOpen}
    >
      <AlertDialogContent className="sm:max-w-[450px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/50 dark:border-white/10 shadow-2xl rounded-3xl">
        <AlertDialogHeader className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-amber-500 dark:text-amber-400">
            <Archive className="h-6 w-6" />
            <AlertDialogTitle className="text-xl font-bold font-outfit uppercase tracking-widest">
              確認封存帳戶？
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-2">
              <span className="text-base text-foreground/80">
                您即將封存帳戶{' '}
                <span className="font-bold text-foreground">
                  {account?.name}
                </span>
                。
              </span>

              <div className="bg-amber-500/10 text-amber-600 dark:text-amber-500 text-sm p-3 rounded-md w-full border border-amber-500/20 mt-1">
                <p className="font-medium flex items-center gap-2">
                  <Archive className="h-4 w-4" />
                  封存後將不會顯示於選擇清單中
                </p>
                <p className="mt-1 opacity-90">
                  未來您可以打開「顯示已封存帳戶」選項，並隨時解除封存以恢復使用。
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-2">
          <AlertDialogCancel
            disabled={isArchiving}
            className={isArchiving ? 'cursor-not-allowed' : 'cursor-pointer'}
          >
            取消
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleArchive();
            }}
            disabled={isArchiving}
            className={cn(
              buttonVariants({ variant: 'default' }),
              'bg-amber-500 hover:bg-amber-600 text-white',
              isArchiving ? 'cursor-not-allowed' : 'cursor-pointer',
            )}
          >
            {isArchiving ? '封存中...' : '確認封存'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default AccountArchiveConfirmDialog;
