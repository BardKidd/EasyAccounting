'use client';

import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PeriodType } from '@repo/shared';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from 'lucide-react';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  addYears,
  subYears,
  startOfYear,
  endOfYear,
} from 'date-fns';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface StatisticsHeaderProps {
  // 當前的統計週期類型 (週/月/年)
  periodType: PeriodType;
  // 切換週期類型的回調函數
  onPeriodChange: (type: PeriodType) => void;
  // 當前選中的日期 (基準日)
  date: Date;
  // 切換日期的回調函數
  onDateChange: (date: Date) => void;
  // 基準當前日期 (解決 hydration issue)
  today?: Date;
}

export function StatisticsHeader({
  periodType,
  onPeriodChange,
  date,
  onDateChange,
  today,
}: StatisticsHeaderProps) {
  const [open, setOpen] = useState(false);

  // --- 導航處理函數 (上一頁) ---
  const handlePrev = () => {
    const newDate = new Date(date);
    // 根據當前週期類型，將日期往前推
    // SubXXX 很方便可以直接拿到需要的日期
    if (periodType === PeriodType.WEEK) {
      onDateChange(subWeeks(newDate, 1));
    } else if (periodType === PeriodType.MONTH) {
      onDateChange(subMonths(newDate, 1));
    } else if (periodType === PeriodType.YEAR) {
      onDateChange(subYears(newDate, 1));
    }
  };

  // --- 導航處理函數 (下一頁) ---
  const handleNext = () => {
    const newDate = new Date(date);
    // 根據當前週期類型，將日期往後推
    if (periodType === PeriodType.WEEK) {
      onDateChange(addWeeks(newDate, 1));
    } else if (periodType === PeriodType.MONTH) {
      onDateChange(addMonths(newDate, 1));
    } else if (periodType === PeriodType.YEAR) {
      onDateChange(addYears(newDate, 1));
    }
  };

  // 獲取主要標題 (例如: "2023 第 5 週", "2023/12")
  const getMainLabel = (d: Date) => {
    if (periodType === PeriodType.WEEK) {
      return `${format(d, 'yyyy')} 第 ${format(d, 'w')} 週`;
    } else if (periodType === PeriodType.MONTH) {
      return format(d, 'yyyy/MM');
    } else {
      return format(d, 'yyyy');
    }
  };

  // 獲取日期範圍副標題 (例如: "01/01 ~ 01/31")
  const getRangeLabel = (d: Date) => {
    if (periodType === PeriodType.WEEK) {
      const start = startOfWeek(d, { weekStartsOn: 1 });
      const end = endOfWeek(d, { weekStartsOn: 1 });
      return `${format(start, 'MM/dd')} ~ ${format(end, 'MM/dd')}`;
    } else if (periodType === PeriodType.MONTH) {
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      return `${format(start, 'MM/dd')} ~ ${format(end, 'MM/dd')}`;
    } else {
      // YEAR
      const start = startOfYear(d);
      const end = endOfYear(d);
      return `${format(start, 'MM/dd')} ~ ${format(end, 'MM/dd')}`;
    }
  };

  // --- 下拉選單列表生成 ---
  const generatePeriodList = () => {
    const list = [];
    // 預設生成過去 24 個週期和未來 5 個週期

    // 以「今天」為基準產生列表
    const now = today || new Date();

    for (let i = -5; i <= 24; i++) {
      // (i 代表「幾個週期前」)
      // i = -5 (未來 5 個週期)
      // i = 0  (當前週期)
      // i = 24 (過去 24 個週期)

      // 我們希列表從未來 (上) 排列到過去 (下)

      let itemDate: Date;

      if (periodType === PeriodType.WEEK) {
        itemDate = subWeeks(now, i);
      } else if (periodType === PeriodType.MONTH) {
        itemDate = subMonths(now, i);
      } else {
        itemDate = subYears(now, i);
      }

      list.push({
        date: itemDate,
        mainLabel: getMainLabel(itemDate),
        rangeLabel: getRangeLabel(itemDate),
      });
    }

    return list;
  };

  const periodList = generatePeriodList();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 p-2 rounded-2xl bg-white/50 dark:bg-slate-900/30 backdrop-blur-sm border border-slate-200/50 dark:border-white/5">
      <div className="flex items-center gap-2 order-2 sm:order-1">
        <Button
          variant="ghost"
          size="icon"
          className="cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400"
          onClick={handlePrev}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-auto h-auto flex-row items-center justify-center py-2 px-4 gap-2 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer bg-white/50 dark:bg-transparent backdrop-blur-sm transition-all duration-200 shadow-sm',
                open && 'border-indigo-500/50 ring-2 ring-indigo-500/20',
              )}
            >
              <CalendarIcon className="w-4 h-4 text-indigo-500/70 dark:text-indigo-400/70" />
              <span className="font-bold text-lg font-playfair text-slate-800 dark:text-slate-100">
                {getMainLabel(date)}
              </span>
              <span className="text-sm text-slate-500 dark:text-slate-400 font-normal hidden sm:inline-block font-mono">
                ({getRangeLabel(date)})
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[320px] p-0 border-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-xl shadow-slate-200/50 dark:shadow-black/20 ring-1 ring-slate-200 dark:ring-white/10"
            align="center"
          >
            <ScrollArea className="h-[300px]">
              <div className="flex flex-col p-2 space-y-1">
                {periodList.map((item, idx) => {
                  const isSelected =
                    getMainLabel(item.date) === getMainLabel(date);
                  return (
                    <Button
                      key={idx}
                      variant="ghost"
                      className={cn(
                        'justify-start h-auto py-3 px-4 flex-row items-center gap-2 font-normal rounded-xl transition-all duration-200',
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 font-medium'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200',
                      )}
                      onClick={() => {
                        onDateChange(item.date);
                        setOpen(false);
                      }}
                    >
                      <span className="text-base">{item.mainLabel}</span>
                      <span className="text-xs text-muted-foreground ml-auto font-mono opacity-70">
                        {item.rangeLabel}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleNext}
          className="cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Tabs
        value={periodType}
        onValueChange={(v) => onPeriodChange(v as PeriodType)}
        className="order-1 sm:order-2"
      >
        <TabsList className="bg-slate-100/50 dark:bg-white/5 p-1 border border-slate-200/50 dark:border-white/5">
          <TabsTrigger
            className="cursor-pointer data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-300 data-[state=active]:shadow-sm transition-all duration-300"
            value={PeriodType.WEEK}
          >
            週
          </TabsTrigger>
          <TabsTrigger
            className="cursor-pointer data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-300 data-[state=active]:shadow-sm transition-all duration-300"
            value={PeriodType.MONTH}
          >
            月
          </TabsTrigger>
          <TabsTrigger
            className="cursor-pointer data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-300 data-[state=active]:shadow-sm transition-all duration-300"
            value={PeriodType.YEAR}
          >
            年
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
