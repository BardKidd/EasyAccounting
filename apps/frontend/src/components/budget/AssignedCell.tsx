'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';

interface AssignedCellProps {
  value: number;
  formatted: string;
  onSubmit: (value: number) => void;
  disabled?: boolean;
}

export function AssignedCell({
  value,
  formatted,
  onSubmit,
  disabled,
}: AssignedCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleCommit = () => {
    setEditing(false);
    const parsed = parseFloat(draft);
    if (!isNaN(parsed) && parsed !== value) {
      onSubmit(parsed);
    }
  };

  if (editing) {
    return (
      <Input
        ref={inputRef}
        type="number"
        step="any"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleCommit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleCommit();
          if (e.key === 'Escape') {
            setEditing(false);
            setDraft(String(value));
          }
        }}
        className="h-11 md:h-8 w-full md:w-28 text-right text-sm font-medium bg-white/50 dark:bg-slate-800/50 border-emerald-300 dark:border-emerald-600 focus-visible:ring-emerald-500/30"
      />
    );
  }

  return (
    <button
      disabled={disabled}
      onClick={() => {
        setDraft(String(value));
        setEditing(true);
      }}
      className="px-2 py-1 rounded-md text-sm font-medium text-right hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors cursor-pointer tabular-nums min-w-[80px] min-h-[44px] md:min-h-0 text-slate-700 dark:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {formatted}
    </button>
  );
}
