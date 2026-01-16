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
    <div className="w-full max-w-[350px] mx-auto space-y-6">
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-3xl font-playfair font-semibold tracking-tight">
          歡迎回來
        </h1>
        <p className="text-sm text-muted-foreground">
          請輸入您的電子郵件與密碼登入
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>電子郵件</FormLabel>
                <FormControl>
                  <Input
                    placeholder="name@example.com"
                    type="email"
                    autoComplete="email"
                    className="h-11" // Slightly taller inputs
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>密碼</FormLabel>
                <FormControl>
                  <Input
                    placeholder="••••••••"
                    type="password"
                    autoComplete="current-password"
                    className="h-11"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="w-full h-11 cursor-pointer font-medium"
            disabled={isLoading}
          >
            {isLoading ? '登入中...' : '登入'}
          </Button>
        </form>
      </Form>
      <div className="text-center text-sm text-muted-foreground">
        還沒有帳戶？{' '}
        <Link
          href="/register"
          className="text-primary underline-offset-4 hover:underline font-medium"
        >
          立即註冊
        </Link>
      </div>
    </div>
  );
}
