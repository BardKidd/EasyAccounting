'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { deleteAccount } from '@/services/userService';
import { clearPushOnLogout } from '@/lib/pushCleanup';

export function DeleteAccountCard() {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const doDelete = async () => {
    setDeleting(true);
    try {
      const res = await deleteAccount();
      // 後端已 soft-delete + 清 auth cookies；本地清乾淨後回登入頁
      localStorage.removeItem('user');
      await clearPushOnLogout();
      toast.success(res.message || '帳號已刪除');
      window.location.href = '/login';
    } catch (err: any) {
      toast.error(err?.message || '刪除失敗');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="text-destructive">危險區</CardTitle>
        <CardDescription>
          刪除帳號會一併移除所有交易、帳戶、預算等資料，此操作無法復原。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="destructive"
          onClick={() => {
            setConfirmText('');
            setOpen(true);
          }}
        >
          刪除帳號
        </Button>
      </CardContent>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除帳號？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作無法復原。所有交易、帳戶、預算與設定將一併刪除。
              請輸入「刪除」以確認。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="請輸入「刪除」"
            disabled={deleting}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmText !== '刪除' || deleting}
              onClick={(e) => {
                e.preventDefault();
                doDelete();
              }}
            >
              {deleting ? '刪除中…' : '確認刪除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export default DeleteAccountCard;
