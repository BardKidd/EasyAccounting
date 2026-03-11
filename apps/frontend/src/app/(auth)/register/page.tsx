'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { registerSchema, type RegisterInput } from '@repo/shared';

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
import { apiHandler, simplifyTryCatch } from '@/lib/utils';
import { checkSession } from '@/services/authService';
import { toast } from 'sonner';

type RegisterFormValues = RegisterInput;

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // FR-3: Auth guard — 若已登入且 Session 有效則自動導回 Dashboard
  useEffect(() => {
    const checkLogin = async () => {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const result = await checkSession();
        if (result.isSuccess) {
          router.replace('/dashboard');
        } else {
          localStorage.removeItem('user');
        }
      }
    };
    checkLogin();
  }, [router]);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(data: RegisterFormValues) {
    simplifyTryCatch(async () => {
      setIsLoading(true);
      const { confirmPassword, ...registerData } = data;
      const url = '/user';
      const result = await apiHandler(url, 'post', registerData);
      if (result.isSuccess) {
        toast.success(result.message);
        router.push('/login');
      }
    }, setIsLoading);
  }

  return (
    <>
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-3xl font-outfit font-bold tracking-tight text-slate-900 dark:text-white">
          建立帳戶
        </h1>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          開始使用 EasyAccounting 管理您的財務
        </p>
      </div>
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
                  <div className="relative group">
                    <Input
                      placeholder="請輸入您的名字"
                      autoComplete="name"
                      className="h-11 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-all duration-300"
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
            name="email"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-slate-700 dark:text-slate-300 font-medium">
                  電子郵件
                </FormLabel>
                <FormControl>
                  <div className="relative group">
                    <Input
                      placeholder="請輸入您的電子郵件"
                      type="email"
                      autoComplete="email"
                      className="h-11 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-all duration-300"
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
                <FormLabel className="text-slate-700 dark:text-slate-300 font-medium">
                  密碼
                </FormLabel>
                <FormControl>
                  <div className="relative group">
                    <Input
                      placeholder="請輸入您的密碼"
                      type="password"
                      autoComplete="new-password"
                      className="h-11 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-all duration-300"
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
            name="confirmPassword"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-slate-700 dark:text-slate-300 font-medium">
                  確認密碼
                </FormLabel>
                <FormControl>
                  <div className="relative group">
                    <Input
                      placeholder="請再次輸入您的密碼"
                      type="password"
                      disabled={isLoading}
                      className="h-11 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-all duration-300"
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
                註冊中...
              </span>
            ) : (
              '註冊'
            )}
          </Button>
        </form>
      </Form>
      <div className="text-center text-sm font-medium text-slate-600 dark:text-slate-400 pt-2">
        已經有帳戶？{' '}
        <Link
          href="/login"
          className="text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300 underline-offset-4 hover:underline transition-colors"
        >
          立即登入
        </Link>
      </div>
    </>
  );
}
