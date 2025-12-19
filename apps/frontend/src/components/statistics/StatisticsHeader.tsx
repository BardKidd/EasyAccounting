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
}

export function StatisticsHeader({
  periodType,
  onPeriodChange,
  date,
  onDateChange,
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
    const now = new Date();

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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
      <div className="flex items-center gap-2 order-2 sm:order-1">
        <Button
          variant="outline"
          size="icon"
          className="cursor-pointer"
          onClick={handlePrev}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-auto h-auto flex-row items-center justify-center py-2 px-4 gap-2 border-dashed hover:border-solid cursor-pointer',
                open && 'border-solid ring-2 ring-primary/20'
              )}
            >
              <CalendarIcon className="w-4 h-4 opacity-70" />
              <span className="font-bold text-lg">{getMainLabel(date)}</span>
              <span className="text-sm text-muted-foreground font-normal hidden sm:inline-block">
                ({getRangeLabel(date)})
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[320px] p-0" align="center">
            <ScrollArea className="h-[300px]">
              <div className="flex flex-col p-1">
                {periodList.map((item, idx) => {
                  const isSelected =
                    getMainLabel(item.date) === getMainLabel(date);
                  return (
                    <Button
                      key={idx}
                      variant={isSelected ? 'secondary' : 'ghost'}
                      className={cn(
                        'justify-start h-auto py-3 px-4 flex-row items-center gap-2 font-normal',
                        isSelected && 'bg-secondary font-medium'
                      )}
                      onClick={() => {
                        onDateChange(item.date);
                        setOpen(false);
                      }}
                    >
                      <span className="text-base">{item.mainLabel}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
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
          variant="outline"
          size="icon"
          onClick={handleNext}
          className="cursor-pointer"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Tabs
        value={periodType}
        onValueChange={(v) => onPeriodChange(v as PeriodType)}
        className="order-1 sm:order-2"
      >
        <TabsList>
          <TabsTrigger className="cursor-pointer" value={PeriodType.WEEK}>
            週
          </TabsTrigger>
          <TabsTrigger className="cursor-pointer" value={PeriodType.MONTH}>
            月
          </TabsTrigger>
          <TabsTrigger className="cursor-pointer" value={PeriodType.YEAR}>
            年
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
