'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Plus, Grid3x3, Camera, PencilLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sidebarItems } from './sidebar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';

// 手機底部導覽的三個主要目的地（其餘收進「更多」）。標籤用短名以配合窄欄。
const PRIMARY: { href: string; label: string }[] = [
  { href: '/dashboard', label: '儀表板' },
  { href: '/transactions', label: '交易' },
  { href: '/accounts', label: '帳戶' },
];
const PRIMARY_HREFS = new Set(PRIMARY.map((p) => p.href));

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** 底部單一 tab（Link 版）。 */
function TabLink({
  href,
  label,
  Icon,
  active,
}: {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-full flex-col items-center justify-center gap-0.5 text-[10px] font-medium tracking-wide transition-colors',
        active
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
      )}
    >
      <Icon className="size-5" />
      <span>{label}</span>
    </Link>
  );
}

export function BottomTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [quickOpen, setQuickOpen] = React.useState(false);

  // FAB 長按 → 快速捕捉選單；短按 → 直接新增交易。
  const holdTimer = React.useRef<number | null>(null);
  const didLongPress = React.useRef(false);

  const startHold = () => {
    didLongPress.current = false;
    holdTimer.current = window.setTimeout(() => {
      didLongPress.current = true;
      setQuickOpen(true);
    }, 450);
  };
  const endHold = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };
  const onFabClick = () => {
    if (didLongPress.current) {
      didLongPress.current = false;
      return;
    }
    router.push('/transactions?new=1');
  };

  const primaryItems = PRIMARY.map((p) => {
    const item = sidebarItems.find((s) => s.href === p.href)!;
    return { ...p, Icon: item.icon };
  });
  const moreItems = sidebarItems.filter((s) => !PRIMARY_HREFS.has(s.href));
  const moreActive = moreItems.some((s) => isActive(pathname, s.href));

  return (
    <>
      <nav
        aria-label="主要導覽"
        className="md:hidden fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/60 dark:border-white/10 bg-white/75 dark:bg-[#0f172a]/75 backdrop-blur-2xl shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.25)] pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid h-16 grid-cols-5">
          <TabLink
            {...primaryItems[0]}
            active={isActive(pathname, primaryItems[0].href)}
          />
          <TabLink
            {...primaryItems[1]}
            active={isActive(pathname, primaryItems[1].href)}
          />

          {/* 中央凸起 FAB：新增交易（長按 → 快速捕捉） */}
          <div className="relative">
            <button
              type="button"
              onClick={onFabClick}
              onPointerDown={startHold}
              onPointerUp={endHold}
              onPointerLeave={endHold}
              onContextMenu={(e) => e.preventDefault()}
              aria-label="新增交易（長按可拍照匯入）"
              className="absolute left-1/2 -top-6 flex size-14 -translate-x-1/2 items-center justify-center rounded-full bg-linear-to-br from-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-500/30 ring-4 ring-slate-50 dark:ring-[#060c15] transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/40"
            >
              <Plus className="size-7" />
            </button>
          </div>

          <TabLink
            {...primaryItems[2]}
            active={isActive(pathname, primaryItems[2].href)}
          />

          {/* 更多 */}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label="更多"
            aria-haspopup="dialog"
            className={cn(
              'flex h-full flex-col items-center justify-center gap-0.5 text-[10px] font-medium tracking-wide transition-colors',
              moreActive
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            <Grid3x3 className="size-5" />
            <span>更多</span>
          </button>
        </div>
      </nav>

      {/* 「更多」：其餘目的地 */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="gap-0 p-0">
          <SheetHeader className="border-b">
            <SheetTitle className="text-base font-semibold">更多功能</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-1 p-3">
            {moreItems.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <SheetClose asChild key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-xl px-2 py-3 text-center text-xs font-medium transition-colors',
                      active
                        ? 'bg-linear-to-br from-emerald-500/15 to-teal-500/5 text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-500/5 dark:hover:bg-white/5'
                    )}
                  >
                    <Icon
                      className={cn(
                        'size-6',
                        active
                          ? 'text-emerald-500 dark:text-emerald-400'
                          : 'text-slate-400 dark:text-slate-500'
                      )}
                    />
                    <span className="leading-tight">{item.title}</span>
                  </Link>
                </SheetClose>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* FAB 長按：快速捕捉 */}
      <Sheet open={quickOpen} onOpenChange={setQuickOpen}>
        <SheetContent side="bottom" className="gap-0 p-0">
          <SheetHeader className="border-b">
            <SheetTitle className="text-base font-semibold">快速記帳</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col p-2">
            <SheetClose asChild>
              <Link
                href="/transactions?new=1"
                className="flex min-h-[52px] items-center gap-3 rounded-lg px-4 py-3 text-base text-foreground transition-colors hover:bg-accent"
              >
                <PencilLine className="size-5 shrink-0 text-emerald-500" />
                <span>手動新增交易</span>
              </Link>
            </SheetClose>
            <SheetClose asChild>
              <Link
                href="/bill-import"
                className="flex min-h-[52px] items-center gap-3 rounded-lg px-4 py-3 text-base text-foreground transition-colors hover:bg-accent"
              >
                <Camera className="size-5 shrink-0 text-emerald-500" />
                <span>拍照 / 匯入帳單</span>
              </Link>
            </SheetClose>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default BottomTabBar;
