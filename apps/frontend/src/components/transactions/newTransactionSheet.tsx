'use client';

import { useMemo, useState, useEffect } from 'react';
import { CalendarIcon, Plus } from 'lucide-react';
import { format } from 'date-fns';
import {
  CategoryType,
  AccountType,
  CreateTransactionSchema,
} from '@repo/shared';
import {
  MainType,
  Account,
  PaymentFrequency,
  transactionFormSchema,
  TransactionFormSchema,
} from '@repo/shared';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import services from '@/services';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

function NewTransactionSheet({
  categories,
  accounts,
}: {
  categories: CategoryType[];
  accounts: AccountType[];
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<TransactionFormSchema>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      accountId: '',
      amount: 0,
      type: MainType.EXPENSE,
      description: '',
      // 解決 Hydration Mismatch: 初始值給 undefined/空字串，在 useEffect 補上
      date: undefined,
      time: '',
      subCategory: '',
      detailCategory: '',
      receipt: '',
      targetAccountId: '',
      paymentFrequency: PaymentFrequency.ONE_TIME,
    },
  });

  // 使用 watch 來監聽表單值的變化
  const watchedType = form.watch('type');
  const watchedSubCategory = form.watch('subCategory');
  const watchedAccountId = form.watch('accountId');

  // 解決 Hydration Mismatch: 在 Client 端才設定預設時間。
  // 根本原因：SSR 的時候宣告 new Date() 會和 CSR 渲染時的結果不一樣，兩份 HTML 不一樣造成 React 警告。
  useEffect(() => {
    const now = new Date();
    form.reset({
      ...form.getValues(),
      date: now,
      time: format(now, 'HH:mm:ss'),
    });
  }, [form]);

  const { subType, detailType } = useMemo(() => {
    if (!categories) return { subType: [], detailType: [] };
    const mainType = categories.filter((c) => c.parent === null);
    const subType = categories.filter((c) =>
      mainType.some((main) => main.id === c.parent?.id)
    );
    const detailType = categories.filter((c) =>
      subType.some((sub) => sub.id === c.parent?.id)
    );
    return { subType, detailType };
  }, [categories]);

  const currentSubCategory = useMemo(() => {
    return subType
      .filter((sub) => sub.type === (watchedType as MainType))
      .map((sub) => ({
        id: sub.id,
        name: sub.name,
        type: sub.type as MainType,
      }));
  }, [watchedType, subType]);

  const currentDetailCategory = useMemo(() => {
    if (!watchedSubCategory) return [];

    return detailType
      .filter(
        (detail) =>
          detail.type === (watchedType as MainType) &&
          (!watchedSubCategory || detail.parent?.id === watchedSubCategory)
      )
      .map((detail) => ({
        id: detail.id,
        name: detail.name,
        type: detail.type as MainType,
      }));
  }, [watchedType, watchedSubCategory, detailType]);

  const onSubmit = async (data: TransactionFormSchema) => {
    // 整理成 API 需要的格式
    const payload: CreateTransactionSchema = {
      accountId: data.accountId,
      categoryId: data.detailCategory || data.subCategory,
      amount: Number(data.amount),
      type: data.type,
      description: data.description,
      // User 選什麼時間就存什麼。存當地時間，不需要轉為 +0
      date: format(data.date, 'yyyy-MM-dd'),
      time: data.time,
      receipt: data.receipt,
      paymentFrequency: data.paymentFrequency,
    };

    try {
      setIsLoading(true);
      const result = await services.addTransaction(payload);
      if (result?.isSuccess) {
        setIsOpen(false);
        toast.success(result.message);
        router.refresh();
        form.reset();
      }
    } catch (err) {
      console.error('新增交易失敗:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button className="cursor-pointer">
          <Plus className="mr-2 h-4 w-4" /> 新增交易
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>新增交易</SheetTitle>
          <SheetDescription>
            請輸入交易詳細資訊。完成後點擊儲存。
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-6 py-4 px-4">
              {/* Type Selection */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <div className="grid grid-cols-3 gap-4">
                      <Button
                        type="button"
                        variant={
                          field.value === MainType.EXPENSE
                            ? 'default'
                            : 'outline'
                        }
                        className={cn(
                          field.value === MainType.EXPENSE &&
                            'bg-rose-600 hover:bg-rose-700',
                          'cursor-pointer'
                        )}
                        onClick={() => {
                          field.onChange(MainType.EXPENSE);
                          form.setValue('subCategory', '');
                          form.setValue('detailCategory', '');
                        }}
                      >
                        {MainType.EXPENSE}
                      </Button>
                      <Button
                        type="button"
                        variant={
                          field.value === MainType.INCOME
                            ? 'default'
                            : 'outline'
                        }
                        className={cn(
                          field.value === MainType.INCOME &&
                            'bg-emerald-600 hover:bg-emerald-700',
                          'cursor-pointer'
                        )}
                        onClick={() => {
                          field.onChange(MainType.INCOME);
                          form.setValue('subCategory', '');
                          form.setValue('detailCategory', '');
                        }}
                      >
                        {MainType.INCOME}
                      </Button>
                      <Button
                        type="button"
                        variant={
                          field.value === MainType.OPERATE
                            ? 'default'
                            : 'outline'
                        }
                        className={cn(
                          field.value === MainType.OPERATE &&
                            'bg-amber-500 hover:bg-amber-600',
                          'cursor-pointer'
                        )}
                        onClick={() => {
                          field.onChange(MainType.OPERATE);
                          form.setValue('subCategory', '');
                          form.setValue('detailCategory', '');
                        }}
                      >
                        {MainType.OPERATE}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category Selection */}
              <div className="grid gap-4 grid-cols-2">
                <FormField
                  control={form.control}
                  name="subCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>主分類</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue('detailCategory', '');
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full cursor-pointer">
                            <SelectValue placeholder="選擇分類" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {currentSubCategory.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="detailCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>子分類</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!watchedSubCategory}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full cursor-pointer">
                            <SelectValue placeholder="選擇子分類" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {currentDetailCategory.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Account Selection */}
              <FormField
                control={form.control}
                name="accountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>帳戶</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full cursor-pointer">
                          <SelectValue placeholder="選擇帳戶" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(Account).map((accountType) => {
                          const typeAccounts = accounts.filter(
                            (acc) => acc.type === accountType
                          );
                          if (typeAccounts.length === 0) return null;
                          return (
                            <SelectGroup key={accountType}>
                              <SelectLabel>{accountType}</SelectLabel>
                              {typeAccounts.map((acc) => (
                                <SelectItem key={acc.id} value={acc.id}>
                                  {acc.name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Amount */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>金額</FormLabel>
                    <div className="relative">
                      <span className="absolute left-3 top-1.5 text-muted-foreground">
                        $
                      </span>
                      <FormControl>
                        <Input
                          placeholder="0.00"
                          className="pl-7 text-lg font-semibold"
                          type="number"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) =>
                            field.onChange(e.target.valueAsNumber || 0)
                          }
                          onFocus={(e) => {
                            // 當數值為 0 時，清空輸入框讓使用者直接輸入
                            if (field.value === 0) {
                              e.target.value = '';
                            }
                          }}
                          onBlur={(e) => {
                            // 離開時解析數值，自動去除開頭的 0
                            const parsed = parseFloat(e.target.value) || 0;
                            field.onChange(parsed);
                          }}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date / Time */}
              <div className="grid gap-4 grid-cols-2">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>日期</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              type="button"
                              variant={'outline'}
                              className={cn(
                                'justify-start text-left font-normal w-full cursor-pointer',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? (
                                format(field.value, 'yyyy/MM/dd')
                              ) : (
                                <span>選擇日期</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            required
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>時間</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          step="1"
                          className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Target Account (Only for OPERATE) */}
              {watchedType === MainType.OPERATE && (
                <FormField
                  control={form.control}
                  name="targetAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>目標帳戶</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full cursor-pointer">
                            <SelectValue placeholder="選擇目標帳戶" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(Account).map((accountType) => {
                            const typeAccounts = accounts.filter(
                              (acc) =>
                                acc.type === accountType &&
                                acc.id !== watchedAccountId
                            );
                            if (typeAccounts.length === 0) return null;
                            return (
                              <SelectGroup key={accountType}>
                                <SelectLabel>{accountType}</SelectLabel>
                                {typeAccounts.map((acc) => (
                                  <SelectItem key={acc.id} value={acc.id}>
                                    {acc.name}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Receipt */}
              <FormField
                control={form.control}
                name="receipt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>發票</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="發票號碼"
                        className="text-lg font-semibold"
                        type="text"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Note */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>備註</FormLabel>
                    <FormControl>
                      <Textarea placeholder="輸入備註..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <SheetFooter>
              <Button
                type="submit"
                className="cursor-pointer"
                disabled={isLoading}
              >
                {isLoading ? '儲存中...' : '儲存交易'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

export default NewTransactionSheet;
