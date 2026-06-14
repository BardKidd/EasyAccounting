'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface BudgetMonthNavProps {
  startMonth: string;
  /** 伺服器「當月」——用於標示未來月份 */
  currentMonth: string;
  /** 可導覽的最遠未來月份（含）= 當月 + BUDGET_MAX_FUTURE_MONTHS */
  maxMonth: string;
  value: string;
  onChange: (month: string) => void;
}

function parseMonth(m: string): [number, number] {
  const [y, mo] = m.split('-').map(Number);
  return [y, mo];
}

function formatMonthLabel(m: string): string {
  const [y, mo] = parseMonth(m);
  const monthNames = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月',
  ];
  return `${y} 年 ${monthNames[mo - 1]}`;
}

function prevMonth(m: string): string {
  let [y, mo] = parseMonth(m);
  mo--;
  if (mo < 1) { mo = 12; y--; }
  return `${y}-${String(mo).padStart(2, '0')}-01`;
}

function nextMonth(m: string): string {
  let [y, mo] = parseMonth(m);
  mo++;
  if (mo > 12) { mo = 1; y++; }
  return `${y}-${String(mo).padStart(2, '0')}-01`;
}

export function BudgetMonthNav({
  startMonth,
  currentMonth,
  maxMonth,
  value,
  onChange,
}: BudgetMonthNavProps) {
  const canPrev = value > startMonth;
  const canNext = value < maxMonth;
  const isFuture = value > currentMonth;

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        data-testid="month-prev"
        disabled={!canPrev}
        onClick={() => onChange(prevMonth(value))}
        className="h-9 w-9 rounded-lg cursor-pointer"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span
        data-testid="month-label"
        className="text-lg font-semibold min-w-[160px] text-center font-outfit tracking-wide text-slate-800 dark:text-slate-100"
      >
        {formatMonthLabel(value)}
        {isFuture && (
          <span
            data-testid="future-badge"
            className="ml-2 align-middle text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400"
          >
            未來
          </span>
        )}
      </span>
      <Button
        variant="ghost"
        size="icon"
        data-testid="month-next"
        disabled={!canNext}
        onClick={() => onChange(nextMonth(value))}
        className="h-9 w-9 rounded-lg cursor-pointer"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
