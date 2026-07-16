'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  changePasswordFormSchema,
  type ChangePasswordFormInput,
} from '@repo/shared';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { changePassword } from '@/services/userService';
import { clearPushOnLogout } from '@/lib/pushCleanup';

export function ChangePasswordCard() {
  const [saving, setSaving] = useState(false);

  const form = useForm<ChangePasswordFormInput>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  const onSubmit = async (data: ChangePasswordFormInput) => {
    setSaving(true);
    try {
      const res = await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      // tokenVersion 已 +1，所有裝置舊 session 作廢；本地也清乾淨後重登
      toast.success(res.message || '密碼已更新，請重新登入');
      localStorage.removeItem('user');
      await clearPushOnLogout();
      window.location.href = '/login';
    } catch (err: any) {
      // apiHandler 在 !isSuccess 時會 throw result，因此密碼錯誤等後端業務失敗
      // 會落在這裡而非 res.isSuccess === false 分支
      if (err && err.isSuccess === false) {
        form.setError('currentPassword', {
          message: err.message || '目前密碼不正確',
        });
      } else {
        toast.error(err?.message || '更新失敗，請再試一次');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>變更密碼</CardTitle>
        <CardDescription>
          更新密碼後，所有裝置都需要重新登入。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-md">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel>目前密碼</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel>新密碼</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmNewPassword"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel>確認新密碼</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={saving}>
              {saving ? '更新中…' : '更新密碼'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default ChangePasswordCard;
