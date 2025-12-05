'use client';

import { useState, useMemo } from 'react';
import { CalendarIcon, Plus } from 'lucide-react';
import { format } from 'date-fns';

import {
  MainType,
  Account,
  TransactionType,
  TransactionTypeWhenOperate,
  PaymentFrequency,
  createTransactionSchema,
} from '@repo/shared';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetClose,
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
  SelectItem,
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
import { useCategoryStore } from '@/stores';
import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';

type TransactionFormType = {
  accountId: string;
  amount: number;
  type: MainType;
  date: Date;
  subCategory: string;
  detailCategory: string | null;
  description: string | null;
  time: number;
  targetAccountId: string | null;
  receipt: string | null;
  paymentFrequency: PaymentFrequency; // 暫不實作
};

export function NewTransactionSheet() {
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date().getTime());
  const [transaction, setTransaction] = useState<TransactionFormType>({
    accountId: '',
    amount: 0,
    type: MainType.EXPENSE,
    description: '',
    date: date,
    time: time,
    subCategory: '',
    detailCategory: '',
    receipt: null,
    targetAccountId: '',
    paymentFrequency: PaymentFrequency.ONE_TIME,
  });
  const form = useForm({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: transaction,
  });
  const { subType, detailType } = useCategoryStore();

  const currentSubCategory = useMemo(() => {
    return subType
      .filter((sub) => sub.type === (transaction.type as MainType))
      .map((sub) => ({
        id: sub.id,
        name: sub.name,
        type: sub.type as MainType,
      }));
  }, [transaction.type, subType]);

  const currentDetailCategory = useMemo(() => {
    if (!transaction.subCategory) return [];

    return detailType
      .filter(
        (detail) =>
          detail.type === (transaction.type as MainType) &&
          (!transaction.subCategory ||
            detail.parent?.name === transaction.subCategory)
      )
      .map((detail) => ({
        id: detail.id,
        name: detail.name,
        type: detail.type as MainType,
      }));
  }, [transaction.type, transaction.subCategory, detailType]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4 cursor-pointer" /> 新增交易
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>新增交易</SheetTitle>
          <SheetDescription>
            請輸入交易詳細資訊。完成後點擊儲存。
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-6 py-4 px-4">
          {/* Type Selection */}
          <div className="grid grid-cols-3 gap-4">
            <Button
              variant={
                transaction.type === MainType.EXPENSE ? 'default' : 'outline'
              }
              className={cn(
                transaction.type === MainType.EXPENSE &&
                  'bg-rose-600 hover:bg-rose-700',
                'cursor-pointer'
              )}
              onClick={() =>
                setTransaction({
                  ...transaction,
                  type: MainType.EXPENSE,
                  subCategory: '',
                  detailCategory: '',
                  description: '',
                })
              }
            >
              {MainType.EXPENSE}
            </Button>
            <Button
              variant={
                transaction.type === MainType.INCOME ? 'default' : 'outline'
              }
              className={cn(
                transaction.type === MainType.INCOME &&
                  'bg-emerald-600 hover:bg-emerald-700',
                'cursor-pointer'
              )}
              onClick={() =>
                setTransaction({
                  ...transaction,
                  type: MainType.INCOME,
                  subCategory: '',
                  detailCategory: '',
                })
              }
            >
              {MainType.INCOME}
            </Button>
            <Button
              variant={
                transaction.type === MainType.OPERATE ? 'default' : 'outline'
              }
              className={cn(
                transaction.type === MainType.OPERATE &&
                  'bg-amber-500 hover:bg-amber-600',
                'cursor-pointer'
              )}
              onClick={() =>
                setTransaction({
                  ...transaction,
                  type: MainType.OPERATE,
                  subCategory: '',
                  detailCategory: '',
                })
              }
            >
              {MainType.OPERATE}
            </Button>
          </div>

          {/* Category Selection */}
          <div className="grid gap-4 grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="subCategory">主分類</Label>
              <Select
                onValueChange={(value) =>
                  setTransaction({
                    ...transaction,
                    subCategory: value,
                    detailCategory: '',
                    description: '',
                  })
                }
                value={transaction.subCategory}
              >
                <SelectTrigger className="w-full cursor-pointer">
                  <SelectValue placeholder="選擇分類" />
                </SelectTrigger>
                <SelectContent>
                  {currentSubCategory.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="detailCategory">子分類</Label>
              <Select
                onValueChange={(value) =>
                  setTransaction({ ...transaction, detailCategory: value })
                }
                value={transaction.detailCategory}
                disabled={!transaction.subCategory}
              >
                <SelectTrigger className="w-full cursor-pointer">
                  <SelectValue placeholder="選擇子分類" />
                </SelectTrigger>
                <SelectContent>
                  {currentDetailCategory.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Account Selection */}
          <div className="grid gap-2">
            <Label htmlFor="account">帳戶</Label>
            <Select
              onValueChange={(value) =>
                setTransaction({ ...transaction, accountId: value })
              }
            >
              <SelectTrigger className="w-full cursor-pointer">
                <SelectValue placeholder="選擇帳戶" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(Account).map((acc) => (
                  <SelectItem key={acc} value={acc}>
                    {acc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="grid gap-2">
            <Label htmlFor="amount">金額</Label>
            <div className="relative">
              <span className="absolute left-3 top-1.5 text-muted-foreground">
                $
              </span>
              <Input
                id="amount"
                placeholder="0.00"
                className="pl-7 text-lg font-semibold"
                type="number"
                value={transaction.amount}
                onChange={(e) =>
                  setTransaction({
                    ...transaction,
                    amount: e.target.valueAsNumber || 0,
                  })
                }
              />
            </div>
          </div>

          {/* Date / Time */}
          <div className="grid gap-4 grid-cols-2">
            <div className="grid gap-2">
              <Label>日期</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={'outline'}
                    className={cn(
                      'justify-start text-left font-normal w-full cursor-pointer',
                      !date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'yyyy/MM/dd') : <span>選擇日期</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    required
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label>時間</Label>
              <Input
                type="time"
                id="time-picker"
                step="1"
                className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                value={format(time, 'HH:mm')}
                onChange={(e) => {
                  console.log(e.target.value);
                  const [hours, minutes] = e.target.value.split(':');
                  const newTime = new Date(time);
                  newTime.setHours(parseInt(hours), parseInt(minutes));
                  setTime(newTime.getTime());
                }}
              />
            </div>
          </div>

          {/* Target Account (Only for OPERATE) */}
          {transaction.type === MainType.OPERATE && (
            <div className="grid gap-2">
              <Label htmlFor="targetAccount">目標帳戶</Label>
              <Select
                onValueChange={(value) =>
                  setTransaction({ ...transaction, targetAccountId: value })
                }
              >
                <SelectTrigger className="w-full cursor-pointer">
                  <SelectValue placeholder="選擇目標帳戶" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(Account).map((acc) => (
                    <SelectItem key={acc} value={acc}>
                      {acc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Receipt */}
          <div className="grid gap-2">
            <Label htmlFor="receipt">發票</Label>
            <Input
              id="receipt"
              placeholder="發票號碼"
              className="pl-7 text-lg font-semibold"
              type="text"
              value={transaction.receipt || ''}
              onChange={(e) =>
                setTransaction({
                  ...transaction,
                  receipt: e.target.value || '',
                })
              }
            />
          </div>

          {/* Note */}
          <div className="grid gap-2">
            <Label htmlFor="description">備註</Label>
            <Textarea
              id="description"
              placeholder="輸入備註..."
              value={transaction.description || ''}
              onChange={(e) =>
                setTransaction({
                  ...transaction,
                  description: e.target.value || '',
                })
              }
            />
          </div>
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button type="submit" className="cursor-pointer">
              儲存交易
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
