'use client';

import { useMemo } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DayIndicators } from '@/lib/calendarUtils';

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

interface MobileMonthCalendarProps {
  /** 月份錨點（顯示該月） */
  date: Date;
  /** 選取日 yyyy-MM-dd */
  selectedDate: string;
  /** 各日期的交易類型指示（getDayIndicators 產出） */
  indicators: Map<string, DayIndicators>;
  onSelectDate: (dateStr: string) => void;
  onNavigate: (newDate: Date) => void;
}

/**
 * 手機版月曆：日期格只放數字＋類型小點，明細由下方 DayTransactionList 呈現。
 * 桌機版仍使用 react-big-calendar（transactionCalendar.tsx 內分流）。
 */
export function MobileMonthCalendar({
  date,
  selectedDate,
  indicators,
  onSelectDate,
  onNavigate,
}: MobileMonthCalendarProps) {
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(date));
    const end = endOfWeek(endOfMonth(date));
    return eachDayOfInterval({ start, end });
  }, [date]);

  return (
    <div>
      <div className="flex items-center justify-between p-4 px-5 bg-white/40 dark:bg-slate-800/40 backdrop-blur-md rounded-t-3xl border-b border-slate-200/50 dark:border-white/10">
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 font-display tracking-tight">
          {format(date, 'yyyy年 M月')}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="上個月"
            className="h-10 w-10 rounded-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200/50 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 shadow-sm transition-all duration-300"
            onClick={() => onNavigate(subMonths(date, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="下個月"
            className="h-10 w-10 rounded-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200/50 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 shadow-sm transition-all duration-300"
            onClick={() => onNavigate(addMonths(date, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-4 text-xs font-medium rounded-full bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200/50 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 hover:text-emerald-800 dark:hover:text-emerald-200 transition-all shadow-sm"
            onClick={() => onNavigate(new Date())}
          >
            今天
          </Button>
        </div>
      </div>

      <div className="px-2 pt-3 pb-2">
        <div className="grid grid-cols-7 pb-1.5 text-center text-[10px] font-semibold text-slate-500 dark:text-slate-400">
          {WEEKDAY_LABELS.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-0.5">
          {days.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayIndicators = indicators.get(dateStr);
            const isSelected = dateStr === selectedDate;
            const isOutside = !isSameMonth(day, date);
            const isTodayDate = isToday(day);

            return (
              <button
                key={dateStr}
                type="button"
                data-testid={`mobile-day-${dateStr}`}
                aria-pressed={isSelected}
                aria-label={format(day, 'M月d日')}
                onClick={() => onSelectDate(dateStr)}
                className="flex min-h-[46px] flex-col items-center gap-[3px] rounded-xl pt-1.5 pb-1 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-emerald-500/50"
              >
                <span
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-sm tabular-nums transition-colors',
                    isOutside && 'text-slate-300 dark:text-slate-600',
                    !isOutside &&
                      !isSelected &&
                      'text-slate-700 dark:text-slate-200',
                    isTodayDate &&
                      !isSelected &&
                      'font-bold text-emerald-600 dark:text-emerald-400 ring-[1.5px] ring-inset ring-emerald-500/60',
                    isSelected &&
                      'bg-linear-to-br from-emerald-500 to-teal-400 font-bold text-white shadow-lg shadow-emerald-500/30',
                  )}
                >
                  {format(day, 'd')}
                </span>
                <span className="flex h-[5px] items-center gap-[3px]">
                  {dayIndicators?.expense && (
                    <span
                      data-testid="dot-expense"
                      className="h-[4.5px] w-[4.5px] rounded-full bg-rose-500 dark:bg-rose-400"
                    />
                  )}
                  {dayIndicators?.income && (
                    <span
                      data-testid="dot-income"
                      className="h-[4.5px] w-[4.5px] rounded-full bg-teal-600 dark:bg-teal-400"
                    />
                  )}
                  {dayIndicators?.transfer && (
                    <span
                      data-testid="dot-transfer"
                      className="h-[4.5px] w-[4.5px] rounded-full bg-amber-600 dark:bg-amber-400"
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
