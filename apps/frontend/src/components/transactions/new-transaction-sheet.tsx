'use client';

import * as React from 'react';
import { CalendarIcon, Plus } from 'lucide-react';
import { format } from 'date-fns';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

export function NewTransactionSheet() {
  const [date, setDate] = React.useState<Date>();
  const [type, setType] = React.useState<'income' | 'expense'>('expense');

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> 新增交易
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>新增交易</SheetTitle>
          <SheetDescription>
            請輸入交易詳細資訊。完成後點擊儲存。
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-6 py-4 px-4">
          {/* Type Selection */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant={type === 'expense' ? 'default' : 'outline'}
              className={cn(
                type === 'expense' && 'bg-rose-600 hover:bg-rose-700',
                'cursor-pointer'
              )}
              onClick={() => setType('expense')}
            >
              支出
            </Button>
            <Button
              variant={type === 'income' ? 'default' : 'outline'}
              className={cn(
                type === 'income' && 'bg-emerald-600 hover:bg-emerald-700',
                'cursor-pointer'
              )}
              onClick={() => setType('income')}
            >
              收入
            </Button>
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
              />
            </div>
          </div>

          {/* Date */}
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
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Category */}
          <div className="grid gap-2">
            <Label htmlFor="category">類別</Label>
            <Select>
              <SelectTrigger className="w-full cursor-pointer">
                <SelectValue placeholder="選擇類別" />
              </SelectTrigger>
              <SelectContent>
                {type === 'expense' ? (
                  <>
                    <SelectItem value="food">餐飲</SelectItem>
                    <SelectItem value="transport">交通</SelectItem>
                    <SelectItem value="shopping">購物</SelectItem>
                    <SelectItem value="entertainment">娛樂</SelectItem>
                    <SelectItem value="housing">居住</SelectItem>
                    <SelectItem value="other">其他</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="salary">薪資</SelectItem>
                    <SelectItem value="investment">投資</SelectItem>
                    <SelectItem value="bonus">獎金</SelectItem>
                    <SelectItem value="other">其他</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Note */}
          <div className="grid gap-2">
            <Label htmlFor="note">備註</Label>
            <Input id="note" placeholder="輸入備註..." />
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
