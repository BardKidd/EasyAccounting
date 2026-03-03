'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  Settings,
  PieChart,
  Menu,
  Command,
  FileCheck,
  Repeat,
  // Calculator, // [HIDDEN] 預算功能暫時停用
} from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet';
import { useState } from 'react';

const sidebarItems = [
  {
    title: '儀表板',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: '交易紀錄',
    href: '/transactions',
    icon: Receipt,
  },
  {
    title: '帳戶管理',
    href: '/accounts',
    icon: Wallet,
  },
  {
    title: '帳單匯入',
    href: '/bill-import',
    icon: Command,
  },
  {
    title: '統計報表',
    href: '/statistics',
    icon: PieChart,
  },
  {
    title: '週期性交易',
    href: '/recurring',
    icon: Repeat,
  },
  {
    title: '信用卡對帳',
    href: '/reconciliation',
    icon: FileCheck,
  },
  // [HIDDEN] 預算功能暫時停用
  // {
  //   title: '預算管理',
  //   href: '/budgets',
  //   icon: Calculator,
  // },
  {
    title: '設定',
    href: '/settings',
    icon: Settings,
  },
];

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

function SidebarContent({
  pathname,
  setOpen,
}: {
  pathname: string;
  setOpen?: (open: boolean) => void;
}) {
  return (
    <div className="flex flex-col h-full py-4 bg-white/40 dark:bg-[#0f172a]/40 backdrop-blur-2xl text-slate-800 dark:text-slate-200 border-r border-slate-200/50 dark:border-white/10 overflow-hidden relative">
      <div className="px-6 md:px-2 lg:px-6 py-4 flex items-center justify-center border-b border-slate-200/50 dark:border-white/10 mb-2 transition-all duration-300">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 hover:opacity-90 transition-all cursor-pointer group justify-center lg:justify-start w-full"
        >
          <div className="group-hover:opacity-80 transition-opacity shrink-0 flex items-center justify-center w-9 h-9 rounded-xl shadow-lg shadow-emerald-500/20">
            <Logo className="w-8 h-8" />
          </div>
          <div className="flex flex-col md:hidden lg:flex shrink-0">
            <span className="text-xl font-bold font-outfit text-slate-800 dark:text-slate-100 leading-none tracking-tight">
              Easy
            </span>
            <span className="text-[10px] font-bold font-outfit tracking-[0.2em] text-emerald-600 dark:text-emerald-400 leading-tight uppercase mt-1">
              Accounting
            </span>
          </div>
        </Link>
      </div>
      <div className="flex-1 py-4 px-3 md:px-2 lg:px-3 overflow-y-auto overflow-x-hidden">
        <nav className="grid gap-1.5">
          {sidebarItems.map((item, index) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={index}
                href={item.href}
                onClick={() => setOpen?.(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-4 py-3 md:px-2 lg:px-4 text-sm font-medium transition-all duration-200 ease-in-out cursor-pointer',
                  'md:justify-center lg:justify-start',
                  isActive
                    ? 'bg-linear-to-r from-emerald-500/15 to-teal-500/5 text-emerald-600 dark:text-emerald-400 border-l-2 border-emerald-500 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 border-l-2 border-transparent hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-500/5 dark:hover:bg-white/5',
                )}
                title={item.title} // Add tooltip for collapsed view
              >
                <item.icon
                  className={cn(
                    'h-5 w-5 shrink-0',
                    isActive
                      ? 'text-emerald-500 dark:text-emerald-400'
                      : 'text-slate-400 dark:text-slate-500 group-hover:text-emerald-500/70 dark:group-hover:text-emerald-400/70',
                  )}
                />
                <span className="tracking-wide block md:hidden lg:block whitespace-nowrap">
                  {item.title}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile Sidebar */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden fixed top-4 left-4 z-40 bg-white/60 dark:bg-[#0f172a]/60 backdrop-blur-xl text-slate-800 dark:text-slate-200 hover:bg-white/80 dark:hover:bg-[#0f172a]/80 border border-slate-200/50 dark:border-white/10 shadow-lg rounded-xl cursor-pointer"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="w-[280px] p-0 border-r-0 bg-transparent"
        >
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>{' '}
          {/* Accessibility */}
          <SidebarContent pathname={pathname} setOpen={setOpen} />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div
        className={cn(
          'hidden md:flex h-screen flex-col border-r border-slate-200/50 dark:border-white/10 shadow-lg shadow-slate-200/20 dark:shadow-black/20 z-50 transition-all duration-300',
          'w-[64px] lg:w-[250px]',
          className,
        )}
      >
        <SidebarContent pathname={pathname} />
      </div>
    </>
  );
}

export default Sidebar;
