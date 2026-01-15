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
  RootType,
  Account,
  PaymentFrequency,
  transactionFormSchema,
  TransactionFormSchema,
  InterestType,
  CalculationMethod,
  RemainderPlacement,
  RewardsType,
} from '@repo/shared';
import { cn, getErrorMessage } from '@/lib/utils';
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
import { z } from '@repo/shared';
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

  // 因為 subCategory 還沒選擇，所以只能在這裡判斷
  const formSchema = useMemo(() => {
    return transactionFormSchema.superRefine((data, ctx) => {
      if (data.type === RootType.OPERATE) return;

      // 找出對應的 Root Category
      const root = categories.find((c) => c.type === data.type);
      if (!root?.children) return;

      // 找出選中的 Main Category
      const mainCategory = root.children.find(
        (c) => c.id === data.mainCategory
      );
      if (!mainCategory) return;

      // 如果該 Main Category 下有子分類，則 subCategory 必填
      if (mainCategory.children && mainCategory.children.length > 0) {
        if (!data.subCategory) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: '請選擇子分類',
            path: ['subCategory'],
          });
        }
      }

      // 分期判斷
      if (
        data.paymentFrequency === PaymentFrequency.INSTALLMENT &&
        data.installment
      ) {
        if (data.installment.totalInstallments < 2) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: '分期期數至少 2 期',
            path: ['installment.totalInstallments'],
          });
        }
      }
    });
  }, [categories]);

  const form = useForm<TransactionFormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accountId: '',
      amount: 0,
      type: RootType.EXPENSE,
      description: '',
      // 解決 Hydration Mismatch: 初始值給 undefined/空字串，在 useEffect 補上
      date: undefined,
      time: '',
      mainCategory: '',
      subCategory: '',
      receipt: '',
      targetAccountId: '',
      paymentFrequency: PaymentFrequency.ONE_TIME,
      installment: {
        totalInstallments: 3,
        interestType: InterestType.NONE,
        calculationMethod: CalculationMethod.ROUND,
        remainderPlacement: RemainderPlacement.FIRST,
        gracePeriod: 0,
        rewardsType: RewardsType.EVERY,
      },
    },
  });

  // 使用 watch 來監聽表單值的變化
  const watchedType = form.watch('type');
  const watchedMainCategory = form.watch('mainCategory');
  const watchedAccountId = form.watch('accountId');
  const watchedPaymentFrequency = form.watch('paymentFrequency');

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === watchedAccountId),
    [watchedAccountId, accounts]
  );

  const isCreditCard = selectedAccount?.type === Account.CREDIT_CARD;

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

  const currentMainCategory = useMemo(() => {
    if (!categories) return [];

    const roots = categories.filter(
      (root) => root.type === (watchedType as RootType)
    );

    // flatMap 比較少用記錄一下：先 map 後 flat，少一步驟。e.g. [{children: []}, {children: []}] -> map: [ [], [] ] -> flat: []
    const mainCategories = roots.flatMap((root) => root.children || []);

    return mainCategories;
  }, [watchedType, categories]);

  const currentSubCategory = useMemo(() => {
    if (!watchedMainCategory || !currentMainCategory) return [];

    const subCategoryMap = new Map<string, CategoryType>();
    currentMainCategory.forEach((cat) => {
      subCategoryMap.set(cat.id, cat);
    });

    const selectedMain = subCategoryMap.get(watchedMainCategory);

    if (!selectedMain || !selectedMain.children) return [];

    return selectedMain.children;
  }, [watchedMainCategory, currentMainCategory]);

  const handleExpenseAndIncomeChange = async (data: TransactionFormSchema) => {
    // 整理成 API 需要的格式
    const payload: CreateTransactionSchema = {
      accountId: data.accountId,
      categoryId: data.subCategory || data.mainCategory,
      amount: Number(data.amount),
      type: data.type as RootType.EXPENSE | RootType.INCOME,
      description: data.description,
      // User 選什麼時間就存什麼。存當地時間，不需要轉為 +0
      date: format(data.date, 'yyyy-MM-dd'),
      time: data.time,
      receipt: data.receipt,
      paymentFrequency: data.paymentFrequency,
      installment:
        data.paymentFrequency === PaymentFrequency.INSTALLMENT
          ? (data.installment as CreateTransactionSchema['installment'])
          : undefined,
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
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOperateChange = async (data: TransactionFormSchema) => {
    const payload = {
      accountId: data.accountId,
      categoryId: data.subCategory || data.mainCategory,
      amount: Number(data.amount),
      type: RootType.OPERATE as RootType.OPERATE,
      description: data.description,
      // User 選什麼時間就存什麼。存當地時間，不需要轉為 +0
      date: format(data.date, 'yyyy-MM-dd'),
      time: data.time,
      receipt: data.receipt,
      paymentFrequency: data.paymentFrequency,
      targetAccountId: data.targetAccountId as string,
    };

    try {
      setIsLoading(true);
      const result = await services.addTransfer(payload);
      if (result?.isSuccess) {
        setIsOpen(false);
        toast.success(result.message);
        router.refresh();
        form.reset();
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: TransactionFormSchema) => {
    if (data.type === RootType.EXPENSE || data.type === RootType.INCOME) {
      await handleExpenseAndIncomeChange(data);
    } else {
      // 轉帳類
      await handleOperateChange(data);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button className="cursor-pointer">
          <Plus className="mr-2 h-4 w-4" /> 新增交易
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto max-h-screen">
        <SheetHeader>
          <SheetTitle>新增交易</SheetTitle>
          <SheetDescription>
            請輸入交易詳細資訊。完成後點擊儲存。
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-6 py-4 px-4 pb-20">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <div className="grid grid-cols-3 gap-4">
                      <Button
                        type="button"
                        variant={
                          field.value === RootType.EXPENSE
                            ? 'default'
                            : 'outline'
                        }
                        className={cn(
                          field.value === RootType.EXPENSE &&
                            'bg-rose-600 hover:bg-rose-700',
                          'cursor-pointer'
                        )}
                        onClick={() => {
                          field.onChange(RootType.EXPENSE);
                          form.setValue('mainCategory', '');
                          form.setValue('subCategory', '');
                          form.clearErrors();
                        }}
                      >
                        {RootType.EXPENSE}
                      </Button>
                      <Button
                        type="button"
                        variant={
                          field.value === RootType.INCOME
                            ? 'default'
                            : 'outline'
                        }
                        className={cn(
                          field.value === RootType.INCOME &&
                            'bg-emerald-600 hover:bg-emerald-700',
                          'cursor-pointer'
                        )}
                        onClick={() => {
                          field.onChange(RootType.INCOME);
                          form.setValue('mainCategory', '');
                          form.setValue('subCategory', '');
                          form.clearErrors();
                        }}
                      >
                        {RootType.INCOME}
                      </Button>
                      <Button
                        type="button"
                        variant={
                          field.value === RootType.OPERATE
                            ? 'default'
                            : 'outline'
                        }
                        className={cn(
                          field.value === RootType.OPERATE &&
                            'bg-amber-500 hover:bg-amber-600',
                          'cursor-pointer'
                        )}
                        onClick={() => {
                          field.onChange(RootType.OPERATE);
                          form.setValue('mainCategory', '');
                          form.setValue('subCategory', '');
                          form.clearErrors();
                        }}
                      >
                        {RootType.OPERATE}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>帳戶</FormLabel>
                    <Select
                      onValueChange={(v) => {
                        field.onChange(v);
                        if (
                          accounts.find((a) => a.id === v)?.type !==
                          Account.CREDIT_CARD
                        ) {
                          form.setValue(
                            'paymentFrequency',
                            PaymentFrequency.ONE_TIME
                          );
                        }
                      }}
                      value={field.value}
                    >
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

              {/* Category Selection */}
              <div
                className={cn(
                  'grid gap-4',
                  watchedType !== RootType.OPERATE && ' grid-cols-2'
                )}
              >
                <FormField
                  control={form.control}
                  name="mainCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>主分類</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue('subCategory', '');
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full cursor-pointer">
                            <SelectValue placeholder="選擇主分類" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {currentMainCategory.map((category) => (
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

                {watchedType !== RootType.OPERATE && (
                  <FormField
                    control={form.control}
                    name="subCategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>子分類</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={
                            !watchedMainCategory ||
                            currentSubCategory.length === 0
                          }
                        >
                          <FormControl>
                            <SelectTrigger className="w-full cursor-pointer">
                              <SelectValue
                                placeholder={
                                  currentSubCategory.length === 0
                                    ? '無子分類'
                                    : '選擇子分類'
                                }
                              />
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
                )}
              </div>

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

              {isCreditCard && watchedType !== RootType.OPERATE && (
                <div className="border rounded-md p-4 bg-gray-50 dark:bg-zinc-900/50 space-y-4">
                  <FormField
                    control={form.control}
                    name="paymentFrequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>繳款方式</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={PaymentFrequency.ONE_TIME}>
                              一次付清
                            </SelectItem>
                            <SelectItem value={PaymentFrequency.INSTALLMENT}>
                              信用卡分期
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  {watchedPaymentFrequency === PaymentFrequency.INSTALLMENT && (
                    <div className="space-y-4 pt-2">
                      <FormField
                        control={form.control}
                        name="installment.totalInstallments"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>分期期數 (月)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(Number(e.target.value))
                                }
                                min={2}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="installment.calculationMethod"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>計算方式</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value={CalculationMethod.ROUND}>
                                    四捨五入
                                  </SelectItem>
                                  <SelectItem value={CalculationMethod.FLOOR}>
                                    無條件捨去
                                  </SelectItem>
                                  <SelectItem value={CalculationMethod.CEIL}>
                                    無條件進位
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="installment.remainderPlacement"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>餘數分配</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value={RemainderPlacement.FIRST}>
                                    首期調整
                                  </SelectItem>
                                  <SelectItem value={RemainderPlacement.LAST}>
                                    末期調整
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

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
              {watchedType === RootType.OPERATE && (
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

            <SheetFooter className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t">
              <Button
                type="submit"
                className="cursor-pointer w-full"
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
