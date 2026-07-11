'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from '@repo/shared';

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
import { resetPassword, checkSession } from '@/services/authService';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/utils';
import { ArrowLeft, CheckCircle2, KeyRound, Loader2 } from 'lucide-react';

// 前端用的 schema（不含 token，token 從 URL 取）
const resetFormSchema = z
  .object({
    password: z.string().min(8, '密碼至少需要 8 個字元'),
    confirmPassword: z.string().min(1, '請確認密碼'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '密碼不相符',
    path: ['confirmPassword'],
  });

type ResetFormInput = z.infer<typeof resetFormSchema>;

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // token 讀進 state 後就不再依賴網址列，方便下方把它從網址移除
  const [token] = useState(() => searchParams.get('token'));
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // 安全性修正 (#33)：讀到 token 後立即從網址列移除，
  // 避免重設 token 殘留於瀏覽器歷史 / referrer 而外洩
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!searchParams.get('token')) return;
    const url = new URL(window.location.href);
    url.searchParams.delete('token');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  }, [searchParams]);

  // Auth guard: 已登入 → replace 到 dashboard
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

  const form = useForm<ResetFormInput>({
    resolver: zodResolver(resetFormSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(data: ResetFormInput) {
    if (!token) {
      toast.error('無效的重設連結');
      return;
    }

    setIsLoading(true);
    try {
      const result = await resetPassword({
        token,
        password: data.password,
        confirmPassword: data.confirmPassword,
      });
      if (result.isSuccess) {
        setIsSuccess(true);
      } else {
        toast.error(result.message || '重設密碼失敗');
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
    setIsLoading(false);
  }

  // 沒有 token 的錯誤畫面
  if (!token) {
    return (
      <div className="flex flex-col items-center space-y-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <KeyRound className="h-8 w-8 text-red-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-outfit font-bold tracking-tight text-slate-900 dark:text-white">
            無效的連結
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            此重設密碼連結無效或已過期，請重新申請。
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
        >
          重新申請
        </Link>
      </div>
    );
  }

  // 成功畫面
  if (isSuccess) {
    return (
      <div className="flex flex-col items-center space-y-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-outfit font-bold tracking-tight text-slate-900 dark:text-white">
            密碼已重設成功
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            您的密碼已成功更新，請使用新密碼登入。
          </p>
        </div>
        <Button
          onClick={() => router.replace('/login')}
          className="h-12 px-8 bg-emerald-500 text-white hover:bg-emerald-600 dark:bg-emerald-500 dark:hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:-translate-y-0.5 text-base font-semibold cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回登入頁
        </Button>
      </div>
    );
  }

  // 重設密碼表單
  return (
    <>
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-3xl font-outfit font-bold tracking-tight text-slate-900 dark:text-white">
          重設密碼
        </h1>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          請輸入您的新密碼
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-slate-700 dark:text-slate-300 font-medium">
                  新密碼
                </FormLabel>
                <FormControl>
                  <div className="relative group">
                    <Input
                      placeholder="••••••••"
                      type="password"
                      autoComplete="new-password"
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
            name="confirmPassword"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-slate-700 dark:text-slate-300 font-medium">
                  確認新密碼
                </FormLabel>
                <FormControl>
                  <div className="relative group">
                    <Input
                      placeholder="••••••••"
                      type="password"
                      autoComplete="new-password"
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
            className="w-full h-12 mt-4 bg-emerald-500 text-white hover:bg-emerald-600 dark:bg-emerald-500 dark:hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:-translate-y-0.5 text-base font-semibold cursor-pointer"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                重設中...
              </span>
            ) : (
              '重設密碼'
            )}
          </Button>
        </form>
      </Form>

      <div className="text-center pt-2">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          返回登入頁
        </Link>
      </div>
    </>
  );
}

function ResetPasswordFallback() {
  return (
    <div className="flex flex-col items-center space-y-4 text-center py-12">
      <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
      <p className="text-sm text-slate-500 dark:text-slate-400">載入中...</p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
