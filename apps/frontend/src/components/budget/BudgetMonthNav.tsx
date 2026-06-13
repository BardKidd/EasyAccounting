'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface BudgetMonthNavProps {
  startMonth: string;
  currentMonth: string;
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
  value,
  onChange,
}: BudgetMonthNavProps) {
  const canPrev = value > startMonth;
  const canNext = value < currentMonth;

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
