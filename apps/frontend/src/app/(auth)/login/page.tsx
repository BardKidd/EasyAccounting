'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { loginSchema, type LoginInput } from '@repo/shared';

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
import { ElegantLoader } from '@/components/ui/elegant-loader';
import { apiHandler, simplifyTryCatch } from '@/lib/utils';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(data: LoginInput) {
    simplifyTryCatch(async () => {
      const url = '/login';
      const result = await apiHandler(url, 'post', data);
      if (result.isSuccess) {
        toast.success(result.message);
        localStorage.setItem('user', JSON.stringify(result.data));
        router.push('/dashboard');
      }
    }, setIsLoading);
  }

  return (
    <>
      {isLoading && <ElegantLoader message="驗證中..." />}
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-3xl font-outfit font-bold tracking-tight text-slate-900 dark:text-white">
          歡迎回來
        </h1>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          請輸入您的電子郵件與密碼登入
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-slate-700 dark:text-slate-300 font-medium">
                  電子郵件
                </FormLabel>
                <FormControl>
                  <div className="relative group">
                    <Input
                      placeholder="name@example.com"
                      type="email"
                      autoComplete="email"
                      className="h-12 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-all duration-300"
                      {...field}
                    />
                  </div>
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
                <div className="flex items-center justify-between">
                  <FormLabel className="text-slate-700 dark:text-slate-300 font-medium">
                    密碼
                  </FormLabel>
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
                  >
                    忘記密碼?
                  </Link>
                </div>
                <FormControl>
                  <div className="relative group">
                    <Input
                      placeholder="••••••••"
                      type="password"
                      autoComplete="current-password"
                      className="h-12 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-all duration-300"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-red-500 dark:text-red-400" />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="w-full h-12 mt-4 bg-emerald-500 text-white hover:bg-emerald-600 dark:bg-emerald-500 dark:hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:-translate-y-0.5 text-base font-semibold"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                登入中...
              </span>
            ) : (
              '登入'
            )}
          </Button>
        </form>
      </Form>
      <div className="text-center text-sm font-medium text-slate-600 dark:text-slate-400 pt-2">
        還沒有帳戶？{' '}
        <Link
          href="/register"
          className="text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300 underline-offset-4 hover:underline transition-colors"
        >
          立即註冊
        </Link>
      </div>
    </>
  );
}
