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
  Landmark,
  FileCheck,
} from 'lucide-react';
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
    title: '統計報表',
    href: '/statistics',
    icon: PieChart,
  },
  {
    title: '信用卡對帳',
    href: '/reconciliation',
    icon: FileCheck,
  },
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
    <div className="flex flex-col h-full py-4 bg-slate-950 text-slate-50 md:bg-slate-950/95 md:backdrop-blur-md">
      <div className="px-6 py-4 flex items-center justify-center border-b border-white/5 mb-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 hover:opacity-90 transition-all cursor-pointer group"
        >
          <div className="p-2 rounded-xl bg-white/10 group-hover:bg-white/20 transition-colors">
            <Landmark className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-xl font-bold tracking-wide text-white font-playfair">
            EasyAccount
          </h2>
        </Link>
      </div>
      <div className="flex-1 py-4 px-3 overflow-y-auto">
        <nav className="grid gap-1.5">
          {sidebarItems.map((item, index) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={index}
                href={item.href}
                onClick={() => setOpen?.(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ease-in-out',
                  isActive
                    ? 'bg-white/10 text-white shadow-lg shadow-black/5 ring-1 ring-white/10 backdrop-blur-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                )}
              >
                <item.icon
                  className={cn(
                    'h-5 w-5',
                    isActive
                      ? 'text-white'
                      : 'text-slate-400 group-hover:text-white'
                  )}
                />
                <span className="tracking-wide">{item.title}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="px-6 py-4 border-t border-white/5 mt-auto bg-black/20">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <p className="text-xs text-slate-400 font-medium">System Online</p>
        </div>
        <p className="text-[10px] text-slate-600 mt-2">© 2025 EasyAccount</p>
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
            className="md:hidden fixed top-4 left-4 z-40 bg-slate-950/80 backdrop-blur-md text-white hover:bg-slate-900 border border-white/10 shadow-lg rounded-lg"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="w-[280px] p-0 border-r-0 bg-slate-950 text-white"
        >
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>{' '}
          {/* Accessibility */}
          <SidebarContent pathname={pathname} setOpen={setOpen} />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div
        className={cn(
          'hidden md:flex h-screen w-72 flex-col border-r border-white/5 bg-slate-950 text-slate-50 shadow-2xl z-50',
          className
        )}
      >
        <SidebarContent pathname={pathname} />
      </div>
    </>
  );
}

export default Sidebar;
