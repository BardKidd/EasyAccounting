'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { registerSchema, type RegisterInput } from '@repo/shared';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { promote } from '@/services/authService';
import { toast } from 'sonner';
import { ElegantLoader } from '@/components/ui/elegant-loader';

interface PromoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PromoteDialog({ open, onOpenChange }: PromoteDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: RegisterInput) => {
    setIsLoading(true);
    try {
      const result = await promote(data);
      if (result.isSuccess) {
        // 更新 localStorage user info
        localStorage.setItem('user', JSON.stringify(result.data));
        toast.success(result.message);
        onOpenChange(false);
        // 註冊為正式用戶後重新渲染一次
        window.location.reload();
      }
    } catch (error: any) {
      // 409 Conflict 的特殊處理
      if (error?.message) {
        toast.error(error.message);
      } else {
        toast.error('註冊失敗，請再試一次');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {isLoading && <ElegantLoader message="註冊中..." />}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              🎉 註冊以永久保存資料
            </DialogTitle>
            <DialogDescription>
              完成註冊後，您的所有帳目紀錄將永久保存，不再受到訪客帳號的限制。
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-slate-700 dark:text-slate-300 font-medium">
                      姓名
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="請輸入您的名字"
                        autoComplete="name"
                        className="h-11 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-all duration-300"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-500 dark:text-red-400" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-slate-700 dark:text-slate-300 font-medium">
                      電子郵件
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="請輸入您的電子郵件"
                        type="email"
                        autoComplete="email"
                        className="h-11 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-all duration-300"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-500 dark:text-red-400" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-slate-700 dark:text-slate-300 font-medium">
                      密碼
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="請輸入您的密碼"
                        type="password"
                        autoComplete="new-password"
                        className="h-11 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-all duration-300"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-500 dark:text-red-400" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-slate-700 dark:text-slate-300 font-medium">
                      確認密碼
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="請再次輸入您的密碼"
                        type="password"
                        className="h-11 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-all duration-300"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-500 dark:text-red-400" />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full h-12 mt-2 bg-emerald-500 text-white hover:bg-emerald-600 dark:bg-emerald-500 dark:hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:-translate-y-0.5 text-base font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    註冊中...
                  </span>
                ) : (
                  '完成註冊'
                )}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
