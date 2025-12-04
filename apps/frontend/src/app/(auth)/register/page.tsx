'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Wallet } from 'lucide-react';
import {
  registerSchema,
  ResponseHelper,
  type RegisterInput,
} from '@repo/shared';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
      const result = await apiHandler(url, 'post', registerData, false);
      if (result.isSuccess) {
        toast.success(result.message);
        router.push('/login');
      }
    }, setIsLoading);
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 rounded-full bg-primary/10">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl text-center">建立帳戶</CardTitle>
        <CardDescription className="text-center">
          開始使用 EasyAccounting 管理您的財務
        </CardDescription>
      </CardHeader>
      <CardContent>
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
                      autoComplete="new-password" // 用於瀏覽器跳出儲存提示
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
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full cursor-pointer"
              disabled={isLoading}
            >
              {isLoading ? '註冊中...' : '註冊'}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        <div className="text-sm text-center text-muted-foreground">
          已經有帳戶？{' '}
          <Link
            href="/login"
            className="text-primary hover:underline font-medium"
          >
            立即登入
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
