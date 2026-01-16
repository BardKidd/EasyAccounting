'use client';

import { useState } from 'react';
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
import { toast } from 'sonner';

type RegisterFormValues = RegisterInput;

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

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
    <div className="w-full bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl rounded-2xl p-8 md:p-10 space-y-6">
      <div className="flex flex-col space-y-2 text-center text-white">
        <h1 className="text-3xl font-playfair font-semibold tracking-wide drop-shadow-sm">
          建立帳戶
        </h1>
        <p className="text-sm text-white/80 font-light tracking-wide">
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
                <FormLabel className="text-white/90 font-light">姓名</FormLabel>
                <FormControl>
                  <div className="relative group">
                    <Input
                      placeholder="請輸入您的名字"
                      autoComplete="name"
                      className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-white/40 focus-visible:border-white/40 transition-all duration-300 hover:bg-white/10 focus:bg-white/10"
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
            name="email"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-white/90 font-light">
                  電子郵件
                </FormLabel>
                <FormControl>
                  <div className="relative group">
                    <Input
                      placeholder="請輸入您的電子郵件"
                      type="email"
                      autoComplete="email"
                      className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-white/40 focus-visible:border-white/40 transition-all duration-300 hover:bg-white/10 focus:bg-white/10"
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
                <FormLabel className="text-white/90 font-light">密碼</FormLabel>
                <FormControl>
                  <div className="relative group">
                    <Input
                      placeholder="請輸入您的密碼"
                      type="password"
                      autoComplete="new-password"
                      className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-white/40 focus-visible:border-white/40 transition-all duration-300 hover:bg-white/10 focus:bg-white/10"
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
            name="confirmPassword"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-white/90 font-light">
                  確認密碼
                </FormLabel>
                <FormControl>
                  <div className="relative group">
                    <Input
                      placeholder="請再次輸入您的密碼"
                      type="password"
                      disabled={isLoading}
                      className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-white/40 focus-visible:border-white/40 transition-all duration-300 hover:bg-white/10 focus:bg-white/10"
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
                註冊中...
              </span>
            ) : (
              '註冊'
            )}
          </Button>
        </form>
      </Form>
      <div className="text-center text-sm text-white/60">
        已經有帳戶？{' '}
        <Link
          href="/login"
          className="text-white underline-offset-4 hover:underline font-medium hover:text-white/90 transition-colors"
        >
          立即登入
        </Link>
      </div>
    </div>
  );
}
