'use client';

import { useMemo } from 'react';
import { CategoryType, RootType } from '@repo/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Plus, Trash2 } from 'lucide-react';

export interface SplitRow {
  categoryId: string;
  amount: number;
  note?: string;
}

interface SplitEditorProps {
  categories: CategoryType[];
  type: RootType;
  totalAmount: number;
  value: SplitRow[];
  onChange: (rows: SplitRow[]) => void;
  focusClassName?: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * 拆分子項編輯器（spec §9.1）：每列分類 + 金額 + 備註，即時加總驗證、平均/補剩餘分配。
 */
export function SplitEditor({
  categories,
  type,
  totalAmount,
  value,
  onChange,
  focusClassName,
}: SplitEditorProps) {
  // 攤平分類樹為可選項（主 / 主｜子）
  const options = useMemo(() => {
    const roots = categories.filter((c) => c.type === type);
    const opts: { id: string; label: string }[] = [];
    for (const root of roots) {
      for (const main of root.children || []) {
        if (main.children && main.children.length > 0) {
          for (const sub of main.children) {
            opts.push({ id: sub.id, label: `${main.name}／${sub.name}` });
          }
        } else {
          opts.push({ id: main.id, label: main.name });
        }
      }
    }
    return opts;
  }, [categories, type]);

  const allocated = round2(
    value.reduce((s, r) => s + (Number(r.amount) || 0), 0),
  );
  const remaining = round2(Number(totalAmount || 0) - allocated);
  const balanced = Math.abs(remaining) < 0.01;

  const update = (i: number, patch: Partial<SplitRow>) =>
    onChange(value.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () =>
    onChange([
      ...value,
      { categoryId: '', amount: remaining > 0 ? remaining : 0, note: '' },
    ]);
  const removeRow = (i: number) =>
    onChange(value.filter((_, idx) => idx !== i));

  const distributeEven = () => {
    const n = value.length || 1;
    const each = round2(Number(totalAmount || 0) / n);
    const rows = value.map((r) => ({ ...r, amount: each }));
    if (rows[0]) rows[0].amount = round2(each + (Number(totalAmount) - each * n));
    onChange(rows);
  };
  const fillRemainingToLast = () => {
    if (!value.length) return;
    const rows = [...value];
    const last = rows.length - 1;
    rows[last] = {
      ...rows[last]!,
      amount: round2(Number(rows[last]!.amount || 0) + remaining),
    };
    onChange(rows);
  };

  return (
    <div
      data-testid="split-editor"
      className="space-y-3 rounded-2xl p-4 bg-slate-50/80 dark:bg-white/5 border border-slate-100 dark:border-white/5"
    >
      {value.map((row, i) => (
        <div key={i} data-testid="split-row" className="flex items-start gap-2">
          <div className="flex-1">
            <Select
              value={row.categoryId}
              onValueChange={(v) => update(i, { categoryId: v })}
            >
              <SelectTrigger
                className={cn(
                  'h-11 rounded-xl bg-white/60 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800/50',
                  focusClassName,
                )}
              >
                <SelectValue placeholder="選擇分類" />
              </SelectTrigger>
              <SelectContent>
                {options.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-28">
            <Input
              type="number"
              inputMode="decimal"
              placeholder="0"
              className={cn(
                'h-11 rounded-xl text-right bg-white/60 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800/50',
                focusClassName,
              )}
              value={row.amount === 0 ? '' : row.amount}
              onChange={(e) =>
                update(i, { amount: e.target.valueAsNumber || 0 })
              }
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-9 shrink-0 text-rose-400 hover:text-rose-600"
            onClick={() => removeRow(i)}
            aria-label="移除子項"
            disabled={value.length <= 1}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 rounded-full border-dashed text-slate-500"
          onClick={addRow}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          新增子項
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-slate-500"
          onClick={distributeEven}
        >
          平均分配
        </Button>
        {!balanced && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-emerald-600 dark:text-emerald-400"
            onClick={fillRemainingToLast}
          >
            把剩餘分到最後一列
          </Button>
        )}
      </div>

      {/* 即時加總列 */}
      <div
        className={cn(
          'flex items-center justify-between text-sm rounded-xl px-3 py-2',
          balanced
            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
            : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300',
        )}
      >
        <span>
          已分配 {allocated.toLocaleString()} / 總額{' '}
          {Number(totalAmount || 0).toLocaleString()}
        </span>
        <span className="font-semibold">
          {balanced ? '已配平' : `剩餘 ${remaining.toLocaleString()}`}
        </span>
      </div>
    </div>
  );
}
