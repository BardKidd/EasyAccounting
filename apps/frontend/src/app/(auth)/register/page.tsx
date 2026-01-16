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
    <div className="w-full max-w-[350px] mx-auto space-y-6">
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-3xl font-playfair font-semibold tracking-tight">
          建立帳戶
        </h1>
        <p className="text-sm text-muted-foreground">
          開始使用 EasyAccounting 管理您的財務
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>姓名</FormLabel>
                <FormControl>
                  <Input
                    placeholder="請輸入您的名字"
                    autoComplete="name"
                    className="h-11"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>電子郵件</FormLabel>
                <FormControl>
                  <Input
                    placeholder="請輸入您的電子郵件"
                    type="email"
                    autoComplete="email"
                    className="h-11"
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
                    placeholder="請輸入您的密碼"
                    type="password"
                    autoComplete="new-password"
                    className="h-11"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>確認密碼</FormLabel>
                <FormControl>
                  <Input
                    placeholder="請再次輸入您的密碼"
                    type="password"
                    disabled={isLoading}
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
            {isLoading ? '註冊中...' : '註冊'}
          </Button>
        </form>
      </Form>
      <div className="text-center text-sm text-muted-foreground">
        已經有帳戶？{' '}
        <Link
          href="/login"
          className="text-primary underline-offset-4 hover:underline font-medium"
        >
          立即登入
        </Link>
      </div>
    </div>
  );
}
