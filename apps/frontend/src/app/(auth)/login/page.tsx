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
import { BetaDesignOverlay } from '@/components/auth/betaDesignOverlay';

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
      <BetaDesignOverlay />
      {isLoading && <ElegantLoader message="驗證中..." />}
      <div className="w-full bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl rounded-2xl p-8 md:p-10 space-y-6">
        <div className="flex flex-col space-y-2 text-center text-white">
          <h1 className="text-3xl font-playfair font-semibold tracking-wide drop-shadow-sm">
            歡迎回來
          </h1>
          <p className="text-sm text-white/80 font-light tracking-wide">
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
                  <FormLabel className="text-white/90 font-light">
                    電子郵件
                  </FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <Input
                        placeholder="name@example.com"
                        type="email"
                        autoComplete="email"
                        className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-white/40 focus-visible:border-white/40 transition-all duration-300 hover:bg-white/10 focus:bg-white/10"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-red-300 font-light" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-white/90 font-light">
                      密碼
                    </FormLabel>
                    <Link
                      href="/forgot-password"
                      className="text-xs text-white/60 hover:text-white transition-colors duration-200"
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
                        className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-white/40 focus-visible:border-white/40 transition-all duration-300 hover:bg-white/10 focus:bg-white/10"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-red-300 font-light" />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full h-12 mt-2 bg-linear-to-r from-white/90 to-white/70 hover:from-white hover:to-white/90 text-slate-900 border-0 shadow-lg shadow-white/5 transition-all duration-300 transform hover:-translate-y-0.5 font-medium text-base tracking-wide"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  登入中...
                </span>
              ) : (
                '登入'
              )}
            </Button>
          </form>
        </Form>
        <div className="text-center text-sm text-white/60">
          還沒有帳戶？{' '}
          <Link
            href="/register"
            className="text-white underline-offset-4 hover:underline font-medium hover:text-white/90 transition-colors"
          >
            立即註冊
          </Link>
        </div>
      </div>
    </>
  );
}
