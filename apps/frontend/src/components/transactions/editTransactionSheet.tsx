'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import {
  TransactionType,
  CategoryType,
  AccountType,
  RootType,
  transactionFormSchema,
  TransactionFormSchema,
  PaymentFrequency,
  InterestType,
  CalculationMethod,
  RemainderPlacement,
  RewardsType,
  Account,
} from '@repo/shared';
import { cn, getErrorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CalendarIcon, Trash2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { updateTransaction, deleteTransaction } from '@/services/transaction';
import { TRANSACTION_COLORS } from '@/lib/transactionColors';

interface EditTransactionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionType | null;
  categories: CategoryType[];
  accounts: AccountType[];
}

export function EditTransactionSheet({
  isOpen,
  onClose,
  transaction,
  categories,
  accounts,
}: EditTransactionSheetProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<TransactionFormSchema>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      accountId: '',
      amount: 0,
      type: RootType.EXPENSE,
      description: '',
      date: undefined,
      time: '',
      mainCategory: '',
      subCategory: '',
      receipt: '',
      targetAccountId: '',
      paymentFrequency: PaymentFrequency.ONE_TIME,
      extraAdd: 0,
      extraAddLabel: '折扣',
      extraMinus: 0,
      extraMinusLabel: '手續費',
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

  // 找出 category 的 main 和 sub
  const findCategoryPath = (
    categoryId: string,
    categoryList: CategoryType[],
  ): { mainCategory: string; subCategory: string } => {
    for (const root of categoryList) {
      if (root.children) {
        for (const main of root.children) {
          if (main.id === categoryId) {
            return { mainCategory: main.id, subCategory: '' };
          }
          if (main.children) {
            for (const sub of main.children) {
              if (sub.id === categoryId) {
                return { mainCategory: main.id, subCategory: sub.id };
              }
            }
          }
        }
      }
    }
    return { mainCategory: '', subCategory: '' };
  };

  // 當 transaction 變化時更新表單
  useEffect(() => {
    if (transaction) {
      const { mainCategory, subCategory } = findCategoryPath(
        transaction.categoryId,
        categories,
      );

      form.reset({
        accountId: transaction.accountId,
        amount: transaction.amount,
        type: transaction.type,
        description: transaction.description || '',
        date: new Date(transaction.date),
        time: transaction.time,
        mainCategory,
        subCategory,
        receipt: '',
        targetAccountId: transaction.targetAccountId || '',
        paymentFrequency: PaymentFrequency.ONE_TIME,
        extraAdd: 0,
        extraAddLabel: '折扣',
        extraMinus: 0,
        extraMinusLabel: '手續費',
      });
    }
  }, [transaction, categories, form]);

  const watchedType = form.watch('type');
  const watchedMainCategory = form.watch('mainCategory');

  // 取得 main categories
  const currentMainCategory = categories
    .filter((root) => root.type === watchedType)
    .flatMap((root) => root.children || []);

  // 取得 sub categories
  const currentSubCategory =
    currentMainCategory.find((c) => c.id === watchedMainCategory)?.children ||
    [];

  const handleUpdate = async (data: TransactionFormSchema) => {
    if (!transaction?.id) return;

    try {
      setIsLoading(true);

      const payload = {
        accountId: data.accountId,
        categoryId: data.subCategory || data.mainCategory,
        amount: Number(data.amount),
        type: data.type as RootType.EXPENSE | RootType.INCOME,
        description: data.description,
        date: format(data.date, 'yyyy-MM-dd'),
        time: data.time,
      };

      const result = await updateTransaction(transaction.id, payload);

      if (result) {
        toast.success('更新成功');
        onClose();
        router.refresh();
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!transaction?.id) return;

    try {
      setIsDeleting(true);
      await deleteTransaction(transaction.id);
      toast.success('刪除成功');
      onClose();
      router.refresh();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  };

  const typeColors = {
    [RootType.EXPENSE]: TRANSACTION_COLORS.expense,
    [RootType.INCOME]: TRANSACTION_COLORS.income,
    [RootType.OPERATE]: TRANSACTION_COLORS.transfer,
  };

  if (!transaction) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-[480px] p-0 flex flex-col h-dvh bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-2xl border-l border-slate-200 dark:border-white/10 shadow-2xl">
        <SheetHeader className="px-6 py-6 border-b border-slate-200/50 dark:border-white/5 bg-white/50 dark:bg-white/2">
          <SheetTitle className="text-xl font-bold font-playfair text-slate-900 dark:text-slate-50">
            編輯交易
          </SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleUpdate)}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {/* Type Display (Read-only for now) */}
              <div
                className={cn(
                  'py-2 px-4 rounded-lg text-center font-medium',
                  typeColors[watchedType as keyof typeof typeColors]?.bg,
                  typeColors[watchedType as keyof typeof typeColors]?.text,
                  typeColors[watchedType as keyof typeof typeColors]?.bgDark,
                  typeColors[watchedType as keyof typeof typeColors]?.textDark,
                )}
              >
                {watchedType}
              </div>

              {/* Account */}
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
                            (acc) => acc.type === accountType,
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

              {/* Category */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="mainCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>主分類</FormLabel>
                      <Select
                        onValueChange={(v) => {
                          field.onChange(v);
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
                          {currentMainCategory.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
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
                  name="subCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>子分類</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={currentSubCategory.length === 0}
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
                          {currentSubCategory.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Amount */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>金額</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-lg font-serif text-slate-500">
                          $
                        </span>
                        <Input
                          type="number"
                          {...field}
                          className="h-10 text-base pl-8 font-medium"
                          value={field.value || ''}
                          onChange={(e) =>
                            field.onChange(e.target.valueAsNumber || 0)
                          }
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
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
                              variant="outline"
                              className="w-full justify-start text-left font-normal cursor-pointer"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value
                                ? format(field.value, 'yyyy-MM-dd')
                                : '選擇日期'}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
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
                        <Input type="time" step="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>備註</FormLabel>
                    <FormControl>
                      <Input placeholder="輸入備註" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Footer */}
            <SheetFooter className="px-6 py-4 border-t border-slate-200/50 dark:border-white/5 bg-white/50 dark:bg-white/2 flex gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    className="mr-auto"
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    刪除
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>確定要刪除這筆交易嗎？</AlertDialogTitle>
                    <AlertDialogDescription>
                      此操作無法復原。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>
                      刪除
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button type="button" variant="outline" onClick={onClose}>
                取消
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? '儲存中...' : '儲存'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
