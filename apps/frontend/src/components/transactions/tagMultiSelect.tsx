'use client';

import { useEffect, useMemo, useState } from 'react';
import { TagType } from '@repo/shared';
import { getTags, createTag } from '@/services/tagService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Check, Plus, Tag as TagIcon, X } from 'lucide-react';
import { toast } from 'sonner';

interface TagMultiSelectProps {
  value: string[]; // 已選 tag id
  onChange: (ids: string[]) => void;
}

/**
 * 標籤多選：chip 顯示已選 + popover 搜尋既有標籤 + 找不到時 on-the-fly 建立。
 * 拆分交易+標籤 Phase A（spec §9.2）。
 */
export function TagMultiSelect({ value, onChange }: TagMultiSelectProps) {
  const [tags, setTags] = useState<TagType[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let active = true;
    getTags()
      .then((data) => {
        if (active) setTags(data || []);
      })
      .catch(() => {
        /* 靜默：標籤非關鍵路徑 */
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedTags = useMemo(
    () =>
      value
        .map((id) => tags.find((t) => t.id === id))
        .filter((t): t is TagType => !!t),
    [value, tags],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tags;
    return tags.filter((t) => t.name.toLowerCase().includes(q));
  }, [tags, query]);

  const exactMatch = useMemo(
    () =>
      tags.some(
        (t) => t.name.toLowerCase() === query.trim().toLowerCase(),
      ),
    [tags, query],
  );

  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((x) => x !== id));
    else onChange([...value, id]);
  };

  const handleCreate = async () => {
    const name = query.trim();
    if (!name || creating) return;
    try {
      setCreating(true);
      const res = await createTag({ name });
      const created = res?.data as TagType | undefined;
      if (created?.id) {
        setTags((prev) =>
          prev.some((t) => t.id === created.id) ? prev : [...prev, created],
        );
        if (!value.includes(created.id)) onChange([...value, created.id]);
        setQuery('');
      }
    } catch {
      toast.error('建立標籤失敗');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {selectedTags.map((t) => (
        <Badge
          key={t.id}
          variant="outline"
          className="gap-1 pl-2 pr-1 py-1 rounded-full"
          style={{ borderColor: t.color, color: t.color }}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: t.color }}
          />
          {t.name}
          <button
            type="button"
            onClick={() => toggle(t.id)}
            className="rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-700/60 p-0.5"
            aria-label={`移除標籤 ${t.name}`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-full border-dashed text-slate-500 dark:text-slate-400"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            標籤
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋或建立標籤"
            className="h-9 mb-2"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (query.trim() && !exactMatch) handleCreate();
              }
            }}
          />
          <div className="max-h-56 overflow-y-auto space-y-0.5">
            {filtered.map((t) => {
              const selected = value.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggle(t.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left',
                    'hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors',
                  )}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: t.color }}
                  />
                  <span className="flex-1 truncate">{t.name}</span>
                  {selected && <Check className="h-4 w-4 text-emerald-500" />}
                </button>
              );
            })}

            {query.trim() && !exactMatch && (
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                建立「{query.trim()}」
              </button>
            )}

            {filtered.length === 0 && !query.trim() && (
              <div className="flex items-center gap-2 px-2 py-3 text-sm text-slate-400">
                <TagIcon className="h-4 w-4" />
                尚無標籤，輸入名稱即可建立
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
