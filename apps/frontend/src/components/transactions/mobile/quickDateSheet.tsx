'use client';

import { useState } from 'react';
import { CalendarDays, ChevronRight, Clock } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface QuickDateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | undefined;
  time: string;
  onDateChange: (date: Date) => void;
  onTimeChange: (time: string) => void;
}

const sameYmd = (a: Date | undefined, b: Date) =>
  !!a &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

/** 日期時間 quick sheet：今天／昨天／前天一鍵選，其他日期才展開日曆。 */
export function QuickDateSheet({
  open,
  onOpenChange,
  date,
  time,
  onDateChange,
  onTimeChange,
}: QuickDateSheetProps) {
  const [showCalendar, setShowCalendar] = useState(false);

  const quickOptions = [
    { label: '今天', value: daysAgo(0) },
    { label: '昨天', value: daysAgo(1) },
    { label: '前天', value: daysAgo(2) },
  ];

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) setShowCalendar(false);
        onOpenChange(o);
      }}
    >
      <SheetContent
        side="bottom"
        aria-describedby={undefined}
        className="max-h-[85dvh] bg-white/95 backdrop-blur-2xl dark:bg-[#0f172a]/95"
      >
        <SheetHeader className="pb-0">
          <SheetTitle className="text-base">日期與時間</SheetTitle>
        </SheetHeader>
        <div className="space-y-3 overflow-y-auto px-4 pb-2">
          <div className="flex gap-2">
            {quickOptions.map((opt) => {
              const selected = sameYmd(date, opt.value);
              return (
                <button
                  key={opt.label}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    onDateChange(opt.value);
                    onOpenChange(false);
                    setShowCalendar(false);
                  }}
                  className={cn(
                    'h-12 flex-1 rounded-2xl border text-sm font-semibold transition-colors',
                    selected
                      ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-200/70 bg-white/50 text-slate-700 hover:bg-slate-50 dark:border-slate-700/60 dark:bg-slate-900/50 dark:text-slate-200 dark:hover:bg-white/5',
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowCalendar((s) => !s)}
            className="flex min-h-12 w-full items-center gap-3 border-t border-slate-100 px-1 pt-3 text-left text-sm font-medium text-slate-600 dark:border-white/5 dark:text-slate-300"
          >
            <CalendarDays className="h-4 w-4 opacity-70" />
            選其他日期…
            <ChevronRight
              className={cn(
                'ml-auto h-4 w-4 opacity-50 transition-transform motion-reduce:transition-none',
                showCalendar && 'rotate-90',
              )}
            />
          </button>
          {showCalendar && (
            <div className="flex justify-center animate-in fade-in slide-in-from-top-2 duration-200 motion-reduce:animate-none">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => {
                  if (!d) return;
                  onDateChange(d);
                  onOpenChange(false);
                  setShowCalendar(false);
                }}
                required
              />
            </div>
          )}

          <label className="flex min-h-12 items-center gap-3 border-t border-slate-100 px-1 pt-3 text-sm font-medium text-slate-600 dark:border-white/5 dark:text-slate-300">
            <Clock className="h-4 w-4 opacity-70" />
            <span>時間</span>
            <input
              aria-label="時間"
              type="time"
              step="1"
              value={time}
              onChange={(e) => onTimeChange(e.target.value)}
              className="ml-auto h-10 rounded-xl border border-slate-200/70 bg-white/50 px-3 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 dark:border-slate-700/60 dark:bg-slate-900/50"
            />
          </label>
        </div>
      </SheetContent>
    </Sheet>
  );
}
