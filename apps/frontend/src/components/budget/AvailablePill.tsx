'use client';

interface AvailablePillProps {
  value: number;
  formatted: string;
}

export function AvailablePill({ value, formatted }: AvailablePillProps) {
  if (value < 0) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 ring-1 ring-red-200/50 dark:ring-red-500/30">
        {formatted}
      </span>
    );
  }
  if (value === 0) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400 ring-1 ring-slate-200/50 dark:ring-slate-600/30">
        {formatted}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 ring-1 ring-emerald-200/50 dark:ring-emerald-500/30">
      {formatted}
    </span>
  );
}
