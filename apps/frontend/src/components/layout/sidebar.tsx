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
  Calculator,
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
    title: '預算管理',
    href: '/budgets',
    icon: Calculator,
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
    <div className="flex flex-col h-full py-4 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="px-6 py-4 flex items-center justify-center border-b border-sidebar-border mb-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 hover:opacity-90 transition-all cursor-pointer group"
        >
          <div className="group-hover:opacity-80 transition-opacity">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 32 32"
              fill="none"
              className="h-8 w-8"
            >
              <rect
                width="32"
                height="32"
                rx="10"
                className="fill-primary"
              />
              <path
                d="M26 22L22 10L18 22H14V10H7M7 16H12M7 22H14M20 17H24"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="stroke-primary-foreground"
              />
              <circle cx="27" cy="9" r="2" className="fill-white" />
            </svg>
          </div>
          <h2 className="text-xl font-bold tracking-wide text-sidebar-foreground">
            EasyAccounting
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
                  'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ease-in-out cursor-pointer',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50',
                )}
              >
                <item.icon
                  className={cn(
                    'h-5 w-5',
                    isActive
                      ? 'text-sidebar-primary'
                      : 'text-muted-foreground group-hover:text-sidebar-foreground',
                  )}
                />
                <span className="tracking-wide">{item.title}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="px-6 py-4 border-t border-sidebar-border mt-auto bg-sidebar-accent/20">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <p className="text-xs text-muted-foreground font-medium">System Online</p>
        </div>
        <p className="text-[10px] text-muted-foreground/60 mt-2">© 2025 EasyAccount</p>
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
            className="md:hidden fixed top-4 left-4 z-40 bg-sidebar/80 backdrop-blur-md text-sidebar-foreground hover:bg-sidebar/90 border border-sidebar-border shadow-lg rounded-lg cursor-pointer"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="w-[280px] p-0 border-r-0 bg-sidebar text-sidebar-foreground"
        >
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>{' '}
          {/* Accessibility */}
          <SidebarContent pathname={pathname} setOpen={setOpen} />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div
        className={cn(
          'hidden md:flex h-screen w-72 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm z-50',
          className,
        )}
      >
        <SidebarContent pathname={pathname} />
      </div>
    </>
  );
}

export default Sidebar;
