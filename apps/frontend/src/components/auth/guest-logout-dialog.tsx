'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
import { Input } from '@/components/ui/input';
import { logout } from '@/services/authService';
import { toast } from 'sonner';
import { ElegantLoader } from '@/components/ui/elegant-loader';

interface GuestLogoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GuestLogoutDialog({
  open,
  onOpenChange,
}: GuestLogoutDialogProps) {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isConfirmed = confirmText === 'DELETE';

  const handleLogout = async () => {
    if (!isConfirmed) return;
    setIsLoading(true);
    try {
      const result = await logout();
      if (result.isSuccess) {
        localStorage.removeItem('user');
        toast.success(result.message);
        router.push('/login');
      }
    } catch {
      toast.error('登出失敗，請再試一次');
    } finally {
      setIsLoading(false);
      setConfirmText('');
      onOpenChange(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setConfirmText('');
    }
    onOpenChange(nextOpen);
  };

  return (
    <>
      {isLoading && <ElegantLoader message="登出中..." />}
      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              ⚠️ 確認登出訪客帳號
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left space-y-3">
              <span className="block font-semibold text-destructive">
                登出後將無法找回目前的帳目資料！
              </span>
              <span className="block text-muted-foreground">
                訪客帳號的所有資料（帳本、交易紀錄等）將在登出後無法恢復。如需保留資料，請先完成註冊。
              </span>
              <span className="block text-sm text-muted-foreground">
                請輸入{' '}
                <code className="px-1.5 py-0.5 bg-muted rounded font-mono font-bold text-destructive">
                  DELETE
                </code>{' '}
                以確認登出：
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            ref={inputRef}
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="輸入 DELETE 以確認"
            className="font-mono"
            autoFocus
          />
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              disabled={!isConfirmed}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              確認登出
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
