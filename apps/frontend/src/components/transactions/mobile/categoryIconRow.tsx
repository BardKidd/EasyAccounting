'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CategoryType } from '@repo/shared';
import { CategoryIcon } from '@/components/ui/category-icon';
import { cn } from '@/lib/utils';

interface CategoryIconRowProps {
  mains: CategoryType[];
  mainCategory: string;
  subCategory: string;
  onSelect: (mainId: string, subId: string) => void;
}

const chipClass = (active: boolean) =>
  cn(
    'flex h-16 min-w-[62px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border px-2.5 text-xs font-medium transition-colors',
    active
      ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
      : 'border-transparent bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 dark:bg-slate-800/70 dark:text-slate-300 dark:hover:bg-slate-700/70',
  );

/**
 * 分類同列切換：主分類列 ↔ 子分類列。
 * 子分類列時最左常駐返回鈕（主分類列沒有）。
 */
export function CategoryIconRow({
  mains,
  mainCategory,
  subCategory,
  onSelect,
}: CategoryIconRowProps) {
  // 展開中的主分類 id；null = 主分類列
  const [openMainId, setOpenMainId] = useState<string | null>(null);

  // 切換交易類型（mains 換掉）時回到主分類列
  useEffect(() => {
    setOpenMainId(null);
  }, [mains]);

  // 已選到子分類（如編輯模式帶值）時，直接停在該主分類的子分類列
  useEffect(() => {
    if (mainCategory && subCategory) setOpenMainId(mainCategory);
  }, [mainCategory, subCategory]);

  const openMain = useMemo(
    () => (openMainId ? (mains.find((m) => m.id === openMainId) ?? null) : null),
    [openMainId, mains],
  );

  return (
    <div className="flex items-stretch gap-2">
      {openMain && (
        <button
          type="button"
          aria-label="返回主分類"
          onClick={() => setOpenMainId(null)}
          className="flex h-16 min-w-[56px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border border-slate-300/60 bg-slate-100/80 px-2 text-xs font-medium text-slate-600 hover:bg-slate-200/70 dark:border-slate-600/60 dark:bg-slate-800/90 dark:text-slate-300 dark:hover:bg-slate-700/70"
        >
          <ChevronLeft className="h-5 w-5" />
          <span>返回</span>
        </button>
      )}
      <div className="flex flex-1 gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {openMain ? (
          <>
            <button
              type="button"
              aria-pressed={mainCategory === openMain.id && !subCategory}
              onClick={() => onSelect(openMain.id, '')}
              className={chipClass(mainCategory === openMain.id && !subCategory)}
            >
              <CategoryIcon iconName={openMain.icon} className="h-5 w-5" />
              <span className="whitespace-nowrap">全部{openMain.name}</span>
            </button>
            {openMain.children.map((sub) => (
              <button
                key={sub.id}
                type="button"
                aria-pressed={subCategory === sub.id}
                onClick={() => onSelect(openMain.id, sub.id)}
                className={chipClass(subCategory === sub.id)}
              >
                <CategoryIcon
                  iconName={sub.icon ?? openMain.icon}
                  className="h-5 w-5"
                />
                <span className="whitespace-nowrap">{sub.name}</span>
              </button>
            ))}
          </>
        ) : (
          mains.map((main) => {
            const hasSubs = (main.children?.length ?? 0) > 0;
            const active = mainCategory === main.id;
            return (
              <button
                key={main.id}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  hasSubs ? setOpenMainId(main.id) : onSelect(main.id, '')
                }
                className={chipClass(active)}
              >
                <CategoryIcon iconName={main.icon} className="h-5 w-5" />
                <span className="flex items-center whitespace-nowrap">
                  {main.name}
                  {hasSubs && <ChevronRight className="h-3 w-3 opacity-60" />}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
