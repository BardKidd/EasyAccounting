'use client';

import * as React from 'react';
import { MoreVertical } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface MobileRowAction {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

/**
 * 觸控列動作：一顆永遠可見的 ⋯ 觸發鈕（44px），點開後從底部彈出 Sheet 列出動作列（每列 ≥52px）。
 * 取代手機上失效的 hover-reveal 列動作（觸控無法 hover，opacity-0 group-hover 會讓編輯/刪除永久隱形）。
 * 桌面仍可沿用原本的 hover 動作；此元件用 `md:hidden` 只在手機出現即可。
 */
export function MobileRowActions({
  actions,
  title = '操作',
  triggerLabel = '更多操作',
  triggerClassName,
  align = 'end',
}: {
  actions: MobileRowAction[];
  title?: string;
  triggerLabel?: string;
  triggerClassName?: string;
  align?: 'start' | 'end';
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('rounded-full text-muted-foreground', triggerClassName)}
          aria-label={triggerLabel}
        >
          <MoreVertical className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="gap-0 p-0">
        <SheetHeader className={cn('border-b', align === 'start' && 'text-left')}>
          <SheetTitle className="text-base font-semibold">{title}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col p-2">
          {actions.map((action, i) => {
            const Icon = action.icon;
            return (
              <SheetClose asChild key={i}>
                <button
                  type="button"
                  disabled={action.disabled}
                  onClick={action.onSelect}
                  className={cn(
                    'flex min-h-[52px] items-center gap-3 rounded-lg px-4 py-3 text-left text-base transition-colors',
                    action.destructive
                      ? 'text-destructive hover:bg-destructive/10 focus-visible:bg-destructive/10'
                      : 'text-foreground hover:bg-accent focus-visible:bg-accent',
                    action.disabled && 'pointer-events-none opacity-50'
                  )}
                >
                  {Icon && <Icon className="size-5 shrink-0" />}
                  <span>{action.label}</span>
                </button>
              </SheetClose>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
