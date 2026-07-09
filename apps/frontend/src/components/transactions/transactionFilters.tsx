'use client';

import { useState, useTransition, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import {
  Calendar as CalendarIcon,
  Check,
  Coins,
  Search,
  Tag as TagIcon,
} from 'lucide-react';
import { getTags } from '@/services/tagService';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
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
import { Account, AccountType, RootType, TagType } from '@repo/shared';

interface TransactionFiltersProps {
  accounts: AccountType[];
}

function TransactionFilters({ accounts }: TransactionFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

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
    searchParams.get('accountId') || 'all',
  );

  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');
  const [minAmount, setMinAmount] = useState(
    searchParams.get('minAmount') || '',
  );
  const [maxAmount, setMaxAmount] = useState(
    searchParams.get('maxAmount') || '',
  );

  const [tags, setTags] = useState<TagType[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(() =>
    searchParams.getAll('tagIds'),
  );

  useEffect(() => {
    let active = true;
    getTags()
      .then((d) => {
        if (active) setTags(d || []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const updateTagFilter = (ids: string[]) => {
    setSelectedTagIds(ids);
    const params = new URLSearchParams(searchParams);
    params.delete('tagIds');
    ids.forEach((id) => params.append('tagIds', id));
    params.delete('page');
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  };

  const toggleTag = (id: string) => {
    if (selectedTagIds.includes(id))
      updateTagFilter(selectedTagIds.filter((x) => x !== id));
    else updateTagFilter([...selectedTagIds, id]);
  };

  const updateFilters = (
    newDate?: DateRange,
    newType?: string,
    newAccountId?: string,
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

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
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

  // 關鍵字搜尋：debounce 400ms 後寫入 URL（與其他篩選一致走 searchParams）
  useEffect(() => {
    const current = searchParams.get('keyword') || '';
    if (keyword === current) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (keyword) params.set('keyword', keyword);
      else params.delete('keyword');
      params.delete('page');
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  const applyAmountFilter = () => {
    const params = new URLSearchParams(searchParams);
    if (minAmount !== '') params.set('minAmount', minAmount);
    else params.delete('minAmount');
    if (maxAmount !== '') params.set('maxAmount', maxAmount);
    else params.delete('maxAmount');
    params.delete('page');
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  };

  const clearAmountFilter = () => {
    setMinAmount('');
    setMaxAmount('');
    const params = new URLSearchParams(searchParams);
    params.delete('minAmount');
    params.delete('maxAmount');
    params.delete('page');
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch sm:flex-wrap">
      {/* 關鍵字搜尋（比對備註 description） */}
      <div className="relative w-full sm:w-[220px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
        <Input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜尋備註…"
          disabled={isPending}
          className="h-10 pl-9 rounded-xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all duration-300"
        />
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={'outline'}
            disabled={isPending}
            className={cn(
              'w-full sm:w-[260px] justify-start text-left font-normal cursor-pointer h-10',
              'rounded-xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow hover:border-slate-300 dark:hover:border-slate-600',
              !date && 'text-slate-500 dark:text-slate-400',
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
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
              <span className="text-slate-500">選擇日期範圍</span>
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

      <Select
        value={type}
        onValueChange={handleTypeChange}
        disabled={isPending}
      >
        <SelectTrigger className="w-full sm:w-[180px] cursor-pointer h-10! rounded-xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow hover:border-slate-300 dark:hover:border-slate-600 focus:ring-emerald-500/30">
          <SelectValue placeholder="交易類型" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">所有類型</SelectItem>
          <SelectItem value={RootType.INCOME}>{RootType.INCOME}</SelectItem>
          <SelectItem value={RootType.EXPENSE}>{RootType.EXPENSE}</SelectItem>
          <SelectItem value={RootType.OPERATE}>{RootType.OPERATE}</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={accountId}
        onValueChange={handleAccountChange}
        disabled={isPending}
      >
        <SelectTrigger className="w-full sm:w-[180px] cursor-pointer h-10! rounded-xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow hover:border-slate-300 dark:hover:border-slate-600 focus:ring-emerald-500/30">
          <SelectValue placeholder="選擇帳戶" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup key="all">
            <SelectItem value="all">所有帳戶</SelectItem>
          </SelectGroup>
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

      {/* 標籤篩選（match ANY） */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={isPending}
            className={cn(
              'w-full sm:w-[160px] justify-start text-left font-normal cursor-pointer h-10',
              'rounded-xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow hover:border-slate-300 dark:hover:border-slate-600',
              selectedTagIds.length === 0 && 'text-slate-500 dark:text-slate-400',
            )}
          >
            <TagIcon className="mr-2 h-4 w-4 text-slate-500" />
            {selectedTagIds.length > 0
              ? `標籤 (${selectedTagIds.length})`
              : '標籤'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          {tags.length === 0 ? (
            <div className="text-sm text-slate-400 px-2 py-3">尚無標籤</div>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-0.5">
              {tags.map((t) => {
                const selected = selectedTagIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTag(t.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: t.color }}
                    />
                    <span className="flex-1 text-left truncate">{t.name}</span>
                    {selected && <Check className="h-4 w-4 text-emerald-500" />}
                  </button>
                );
              })}
            </div>
          )}
          {selectedTagIds.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-1 text-xs text-slate-500"
              onClick={() => updateTagFilter([])}
            >
              清除標籤篩選
            </Button>
          )}
        </PopoverContent>
      </Popover>

      {/* 金額區間篩選（原幣 amount >= / <=） */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={isPending}
            className={cn(
              'w-full sm:w-[160px] justify-start text-left font-normal cursor-pointer h-10',
              'rounded-xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow hover:border-slate-300 dark:hover:border-slate-600',
              minAmount === '' &&
                maxAmount === '' &&
                'text-slate-500 dark:text-slate-400',
            )}
          >
            <Coins className="mr-2 h-4 w-4 text-slate-500" />
            {minAmount !== '' || maxAmount !== ''
              ? `金額 ${minAmount || '0'}–${maxAmount || '∞'}`
              : '金額'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 space-y-3" align="start">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              inputMode="decimal"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              placeholder="最低"
              className="h-9"
            />
            <span className="text-slate-400">–</span>
            <Input
              type="number"
              inputMode="decimal"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              placeholder="最高"
              className="h-9"
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              onClick={applyAmountFilter}
              disabled={isPending}
            >
              套用
            </Button>
            {(minAmount !== '' || maxAmount !== '') && (
              <Button
                size="sm"
                variant="ghost"
                className="text-xs text-slate-500"
                onClick={clearAmountFilter}
              >
                清除
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default TransactionFilters;
