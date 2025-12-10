'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Check, ChevronsUpDown } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Account, AccountType, MainType } from '@repo/shared';

interface TransactionFiltersProps {
  accounts: AccountType[];
}

function TransactionFilters({ accounts }: TransactionFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize state from URL
  const [date, setDate] = useState<DateRange | undefined>(() => {
    const start = searchParams.get('startDate');
    const end = searchParams.get('endDate');
    if (start && end) {
      return { from: new Date(start), to: new Date(end) };
    }
    return undefined;
  });

  const [type, setType] = useState(searchParams.get('type') || 'all');
  const [accountId, setAccountId] = useState(
    searchParams.get('accountId') || 'all'
  );

  // Update URL helper
  const updateFilters = (
    newDate?: DateRange,
    newType?: string,
    newAccountId?: string
  ) => {
    const params = new URLSearchParams(searchParams);

    if (newDate?.from) {
      params.set('startDate', format(newDate.from, 'yyyy-MM-dd'));
    } else {
      params.delete('startDate');
    }

    if (newDate?.to) {
      params.set('endDate', format(newDate.to, 'yyyy-MM-dd'));
    } else {
      params.delete('endDate');
    }

    if (newType && newType !== 'all') {
      params.set('type', newType);
    } else {
      params.delete('type');
    }

    if (newAccountId && newAccountId !== 'all') {
      params.set('accountId', newAccountId);
    } else {
      params.delete('accountId');
    }

    // Reset pagination
    params.delete('page');

    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleDateChange = (val: DateRange | undefined) => {
    setDate(val);
    if (val?.from && val?.to) {
      updateFilters(val, type, accountId);
    } else if (!val) {
      updateFilters(undefined, type, accountId);
    }
  };

  const handleTypeChange = (val: string) => {
    setType(val);
    updateFilters(date, val, accountId);
  };

  const handleAccountChange = (val: string) => {
    setAccountId(val);
    updateFilters(date, type, val);
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="grid gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant={'outline'}
              className={cn(
                'w-[260px] justify-start text-left font-normal cursor-pointer',
                !date && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, 'yyyy-MM-dd')} -{' '}
                    {format(date.to, 'yyyy-MM-dd')}
                  </>
                ) : (
                  format(date.from, 'yyyy-MM-dd')
                )
              ) : (
                <span>選擇日期範圍</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={handleDateChange}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>

      <Select value={type} onValueChange={handleTypeChange}>
        <SelectTrigger className="w-[180px] cursor-pointer">
          <SelectValue placeholder="交易類型" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">所有類型</SelectItem>
          <SelectItem value={MainType.INCOME}>{MainType.INCOME}</SelectItem>
          <SelectItem value={MainType.EXPENSE}>{MainType.EXPENSE}</SelectItem>
          <SelectItem value={MainType.OPERATE}>{MainType.OPERATE}</SelectItem>
        </SelectContent>
      </Select>

      <Select value={accountId} onValueChange={handleAccountChange}>
        <SelectTrigger className="w-[180px] cursor-pointer">
          <SelectValue placeholder="選擇帳戶" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">所有帳戶</SelectItem>
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
        </SelectContent>
      </Select>
    </div>
  );
}

export default TransactionFilters;
