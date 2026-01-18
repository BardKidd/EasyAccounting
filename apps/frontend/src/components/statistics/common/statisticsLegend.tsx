'use client';

import { cn } from '@/lib/utils';

export interface LegendOption {
  key: string;
  label: string;
  color: string;
}

interface StatisticsLegendProps {
  options: LegendOption[];
  isSelected: (key: string) => boolean;
  onToggle: (key: string) => void;
  className?: string;
}

export function StatisticsLegend({
  options,
  isSelected,
  onToggle,
  className,
}: StatisticsLegendProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-center gap-2',
        className,
      )}
    >
      {options.map((option) => {
        const selected = isSelected(option.key);
        return (
          <button
            key={option.key}
            onClick={() => onToggle(option.key)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border cursor-pointer hover:shadow-sm hover:scale-105',
              selected
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700 shadow-sm'
                : 'bg-transparent text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-white/5',
            )}
          >
            <span
              className={cn('w-2 h-2 rounded-full shadow-sm', option.color)}
              style={
                selected ? { boxShadow: `0 0 8px ${option.color}` } : undefined
              }
            />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
