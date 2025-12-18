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
        className
      )}
    >
      {options.map((option) => {
        const selected = isSelected(option.key);
        return (
          <button
            key={option.key}
            onClick={() => onToggle(option.key)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border cursor-pointer',
              selected
                ? 'bg-muted text-foreground border-primary'
                : 'bg-transparent text-muted-foreground border-transparent hover:bg-muted/50'
            )}
          >
            <span className={cn('w-2 h-2 rounded-full', option.color)} />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
