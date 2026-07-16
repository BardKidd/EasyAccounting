'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateProfileSchema, type UpdateProfileInput } from '@repo/shared';
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
import { checkSession } from '@/services/authService';
import { updateProfile } from '@/services/userService';

export function ProfileInfoCard() {
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    let mounted = true;
    checkSession()
      .then((res) => {
        if (!mounted || !res?.isSuccess || !res.data) return;
        setEmail(res.data.email);
        form.reset({ name: res.data.name });
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (data: UpdateProfileInput) => {
    setSaving(true);
    try {
      const res = await updateProfile(data);
      if (res.isSuccess) {
        // 同步 header 顯示名稱（header 讀 localStorage + 監聽 user-updated）
        const userStr = localStorage.getItem('user');
        if (userStr) {
          localStorage.setItem(
            'user',
            JSON.stringify({ ...JSON.parse(userStr), name: data.name }),
          );
          window.dispatchEvent(new Event('user-updated'));
        }
        toast.success(res.message || '個人資料已更新');
      } else {
        toast.error(res.message || '更新失敗');
      }
    } catch (err: any) {
      toast.error(err?.message || '更新失敗');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>帳號資料</CardTitle>
        <CardDescription>
          更新顯示名稱。電子郵件為登入帳號，目前不支援修改。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-md">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel>顯示名稱</FormLabel>
                  <FormControl>
                    <Input placeholder="請輸入您的名字" autoComplete="name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormItem className="space-y-1">
              <FormLabel>電子郵件</FormLabel>
              <FormControl>
                <Input value={email} disabled readOnly />
              </FormControl>
            </FormItem>
            <Button type="submit" disabled={saving}>
              {saving ? '儲存中…' : '儲存變更'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default ProfileInfoCard;
