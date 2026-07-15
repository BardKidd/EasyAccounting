'use client';

import { useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { cn } from '@/lib/utils';

interface ExtraFields {
  extraAdd: number;
  extraAddLabel: string;
  extraMinus: number;
  extraMinusLabel: string;
}

const fmt = (n: number) => n.toLocaleString('en-US');

/**
 * 額外金額（加項／減項）：金額欄正下方的摺疊列。
 * 沒值時是虛線提示列；有值時亮 emerald 摘要（折扣 +20 · 手續費 −15）。
 */
export function ExtraAmountInline() {
  const { register, watch } = useFormContext<ExtraFields>();
  const [open, setOpen] = useState(false);

  const extraAdd = Number(watch('extraAdd')) || 0;
  const extraMinus = Number(watch('extraMinus')) || 0;
  const addLabel = watch('extraAddLabel') || '加項';
  const minusLabel = watch('extraMinusLabel') || '減項';

  const parts: string[] = [];
  if (extraAdd > 0) parts.push(`${addLabel} +${fmt(extraAdd)}`);
  if (extraMinus > 0) parts.push(`${minusLabel} −${fmt(extraMinus)}`);
  const hasValue = parts.length > 0;

  const inputClass =
    'h-11 rounded-xl border border-slate-200/60 bg-white/50 px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 dark:border-slate-700/60 dark:bg-slate-900/50';

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex min-h-10 w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-medium transition-colors',
          hasValue
            ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
            : 'border-dashed border-slate-300/70 text-slate-500 dark:border-slate-600/70 dark:text-slate-400',
        )}
      >
        {!hasValue && <Plus className="h-3.5 w-3.5 shrink-0" />}
        <span className="truncate">
          {hasValue ? parts.join(' · ') : '額外金額（折扣／手續費）'}
        </span>
        <ChevronDown
          className={cn(
            'ml-auto h-4 w-4 shrink-0 opacity-60 transition-transform motion-reduce:transition-none',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200 motion-reduce:animate-none">
          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                ＋
              </span>
              <input
                aria-label="加項名稱"
                placeholder="例如：獎金"
                className={cn(inputClass, 'min-w-0 flex-1 font-medium')}
                {...register('extraAddLabel')}
              />
              <input
                aria-label="加項金額"
                type="number"
                inputMode="decimal"
                placeholder="0"
                className={cn(
                  inputClass,
                  'w-28 shrink-0 text-right font-semibold tabular-nums',
                )}
                {...register('extraAdd', { valueAsNumber: true })}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-sm font-bold text-rose-600 dark:text-rose-400">
                −
              </span>
              <input
                aria-label="減項名稱"
                placeholder="例如：稅金"
                className={cn(inputClass, 'min-w-0 flex-1 font-medium')}
                {...register('extraMinusLabel')}
              />
              <input
                aria-label="減項金額"
                type="number"
                inputMode="decimal"
                placeholder="0"
                className={cn(
                  inputClass,
                  'w-28 shrink-0 text-right font-semibold tabular-nums',
                )}
                {...register('extraMinus', { valueAsNumber: true })}
              />
            </div>
            <p className="pb-1 text-[10px] tracking-wide text-slate-400 dark:text-slate-500">
              名稱可改（獎金、稅金…），為不計入分類統計的調整額。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
