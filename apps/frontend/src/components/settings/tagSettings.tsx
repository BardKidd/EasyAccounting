'use client';

import { useEffect, useState } from 'react';
import { TagType } from '@repo/shared';
import {
  getTags,
  createTag,
  updateTag,
  deleteTag,
} from '@/services/tagService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Archive, ArchiveRestore, Plus, Tag as TagIcon, Trash2 } from 'lucide-react';

const PALETTE = [
  '#6b7280',
  '#ef4444',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
];

/**
 * 極簡標籤管理（spec §9.2）：建立 / 改名 / 換色 / 封存 / 刪除。
 */
export function TagSettings() {
  const [tags, setTags] = useState<TagType[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PALETTE[0]);

  const load = () => {
    setLoading(true);
    getTags(true)
      .then((d) => setTags(d || []))
      .catch(() => toast.error('載入標籤失敗'))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      const res = await createTag({ name, color: newColor });
      const created = res?.data as TagType | undefined;
      if (created?.id) {
        setTags((p) =>
          p.some((t) => t.id === created.id) ? p : [...p, created],
        );
        setNewName('');
        toast.success('標籤已建立');
      }
    } catch {
      toast.error('建立標籤失敗');
    }
  };

  const handleRename = async (tag: TagType, name: string) => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === tag.name) return;
    try {
      await updateTag(tag.id, { name: trimmed });
      setTags((p) =>
        p.map((t) => (t.id === tag.id ? { ...t, name: trimmed } : t)),
      );
    } catch {
      toast.error('更新失敗，可能已有同名標籤');
      load();
    }
  };

  const handleColor = async (tag: TagType, color: string) => {
    try {
      await updateTag(tag.id, { color });
      setTags((p) => p.map((t) => (t.id === tag.id ? { ...t, color } : t)));
    } catch {
      toast.error('更新顏色失敗');
    }
  };

  const handleArchive = async (tag: TagType) => {
    try {
      await updateTag(tag.id, { isArchived: !tag.isArchived });
      setTags((p) =>
        p.map((t) =>
          t.id === tag.id ? { ...t, isArchived: !t.isArchived } : t,
        ),
      );
    } catch {
      toast.error('更新失敗');
    }
  };

  const handleDelete = async (tag: TagType) => {
    if (
      !confirm(
        `確定刪除標籤「${tag.name}」？此操作會移除所有交易上的此標籤，且無法復原。`,
      )
    )
      return;
    try {
      await deleteTag(tag.id);
      setTags((p) => p.filter((t) => t.id !== tag.id));
      toast.success('已刪除');
    } catch {
      toast.error('刪除失敗');
    }
  };

  return (
    <Card className="rounded-3xl p-6 bg-white/60 dark:bg-[#0f172a]/60 backdrop-blur-2xl border-slate-200/50 dark:border-white/10 shadow-xl space-y-6">
      <div className="space-y-1">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          標籤管理
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          標籤是跨分類的橫向標記（如「日本旅遊 2026」「可報帳」），可貼在任何交易上。
        </p>
      </div>

      {/* 新增 */}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          className="h-10 w-10 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer bg-transparent"
          aria-label="新標籤顏色"
        />
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="輸入標籤名稱"
          className="h-10 flex-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <Button type="button" onClick={handleAdd} className="h-10 rounded-xl">
          <Plus className="h-4 w-4 mr-1" />
          新增
        </Button>
      </div>

      {/* 清單 */}
      {loading ? (
        <div className="text-sm text-slate-400 py-6 text-center">載入中…</div>
      ) : tags.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-slate-400">
          <TagIcon className="h-8 w-8" />
          <span className="text-sm">尚無標籤，於上方新增第一個</span>
        </div>
      ) : (
        <div className="space-y-2">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className={cnRow(tag.isArchived)}
            >
              <input
                type="color"
                value={tag.color}
                onChange={(e) => handleColor(tag, e.target.value)}
                className="h-8 w-8 rounded-md border border-slate-200 dark:border-slate-700 cursor-pointer bg-transparent shrink-0"
                aria-label={`${tag.name} 顏色`}
              />
              <Input
                defaultValue={tag.name}
                className="h-9 flex-1 border-transparent bg-transparent focus-visible:border-slate-200 dark:focus-visible:border-slate-700"
                onBlur={(e) => handleRename(tag, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                }}
              />
              {tag.isArchived && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300 shrink-0">
                  已封存
                </span>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-slate-400 hover:text-slate-600"
                onClick={() => handleArchive(tag)}
                title={tag.isArchived ? '取消封存' : '封存'}
              >
                {tag.isArchived ? (
                  <ArchiveRestore className="h-4 w-4" />
                ) : (
                  <Archive className="h-4 w-4" />
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-rose-400 hover:text-rose-600"
                onClick={() => handleDelete(tag)}
                title="刪除"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function cnRow(archived: boolean) {
  return [
    'flex items-center gap-2 p-2 rounded-xl border border-slate-100 dark:border-white/5',
    'bg-slate-50/60 dark:bg-white/5 transition-colors',
    archived ? 'opacity-60' : '',
  ].join(' ');
}
