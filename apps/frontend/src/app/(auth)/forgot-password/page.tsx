'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@repo/shared';

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
import { forgotPassword, checkSession } from '@/services/authService';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/utils';
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

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

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit(data: ForgotPasswordInput) {
    setIsLoading(true);
    try {
      const result = await forgotPassword(data.email);
      if (result.isSuccess) {
        setIsSent(true);
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
    setIsLoading(false);
  }

  // 已寄出提示畫面
  if (isSent) {
    return (
      <div className="flex flex-col items-center space-y-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-outfit font-bold tracking-tight text-slate-900 dark:text-white">
            信件已寄出
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-sm">
            若此信箱已註冊，您將收到重設密碼的信件。請檢查您的信箱（包含垃圾郵件資料夾）。
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          返回登入頁
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-3xl font-outfit font-bold tracking-tight text-slate-900 dark:text-white">
          忘記密碼
        </h1>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          請輸入您的電子郵件，我們將寄送重設密碼的連結給您
        </p>
      </div>
      <Form {...form}>
        {/* method="post"：JS 尚未 hydrate 時瀏覽器會原生提交，預設 GET 會把 email 序列化進 URL query */}
        <form
          method="post"
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-5"
        >
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
          <Button
            type="submit"
            className="w-full h-12 mt-4 bg-emerald-500 text-white hover:bg-emerald-600 dark:bg-emerald-500 dark:hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:-translate-y-0.5 text-base font-semibold cursor-pointer"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                寄送中...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                寄送重設連結
              </span>
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
