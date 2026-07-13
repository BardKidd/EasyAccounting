'use client';

import { useEffect, useState } from 'react';
import { Share, SquarePlus } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { usePWAInstall } from '@/hooks/usePWAInstall';

const STEPS = [
  {
    icon: Share,
    title: '點選底部的「分享」',
    body: '在 Safari 工具列中找到分享圖示並點擊。',
  },
  {
    icon: SquarePlus,
    title: '選擇「加入主畫面」',
    body: '向下捲動選單，點選「加入主畫面」即完成安裝。',
  },
];

/**
 * iOS "Add to Home Screen" guide (spec §5). iOS Safari has no `beforeinstallprompt`,
 * so we detect + guide manually. Shows only on iOS Safari, not-yet-installed, not snoozed.
 * Appears a beat after load (not on first paint) so it never slams the user; dismissing
 * snoozes it for 24h via usePWAInstall.
 */
export function IOSInstallPrompt() {
  const { shouldPrompt, dismiss } = usePWAInstall();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!shouldPrompt) {
      setVisible(false);
      return;
    }
    const t = setTimeout(() => setVisible(true), 2500);
    return () => clearTimeout(t);
  }, [shouldPrompt]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setVisible(false);
      dismiss();
    }
  };

  return (
    <Sheet open={visible} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-slate-200/60 dark:border-white/10 bg-white/80 dark:bg-[#0f172a]/85 backdrop-blur-2xl px-6 pb-[calc(1.5rem+var(--safe-area-bottom))] pt-7 sm:max-w-lg sm:mx-auto"
      >
        {/* grab handle */}
        <div className="mx-auto mb-5 h-1.5 w-11 shrink-0 rounded-full bg-slate-300/80 dark:bg-white/15" />

        <SheetHeader className="items-center p-0 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500/15 to-teal-500/10 ring-1 ring-emerald-500/20 shadow-lg shadow-emerald-500/10">
            <Logo className="h-9 w-9" />
          </div>
          <SheetTitle className="font-outfit text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            加入主畫面
          </SheetTitle>
          <SheetDescription className="mx-auto max-w-xs text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            像 App 一樣全螢幕開啟 EasyAccounting，啟動更快、體驗更沉浸。
          </SheetDescription>
        </SheetHeader>

        <ol className="my-6 space-y-3">
          {STEPS.map((step, i) => (
            <li
              key={i}
              className="flex items-center gap-4 rounded-2xl border border-slate-200/60 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.03] p-3.5"
            >
              <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-emerald-500 to-teal-400 text-white shadow-md shadow-emerald-500/25">
                <step.icon className="h-5 w-5" strokeWidth={2.25} />
                <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white dark:bg-[#0f172a] text-[11px] font-bold text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30">
                  {i + 1}
                </span>
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {step.title}
                </p>
                <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <SheetFooter className="p-0">
          <Button
            onClick={() => handleOpenChange(false)}
            className="h-11 w-full rounded-xl bg-linear-to-br from-emerald-500 to-teal-400 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 transition-transform hover:scale-[1.02] hover:from-emerald-500 hover:to-teal-400"
          >
            我知道了
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
