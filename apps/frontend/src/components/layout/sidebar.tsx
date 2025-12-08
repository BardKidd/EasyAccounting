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
    <div className="flex flex-col h-full py-4">
      <div className="px-6 py-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
        >
          <Landmark className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-bold tracking-tight text-primary">
            EasyAccount
          </h2>
        </Link>
      </div>
      <div className="flex-1 py-4">
        <nav className="grid gap-1 px-2">
          {sidebarItems.map((item, index) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={index}
                href={item.href}
                onClick={() => setOpen?.(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="px-6 py-4 border-t">
        <p className="text-xs text-muted-foreground">© 2025 EasyAccount</p>
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
            className="md:hidden fixed top-4 left-4 z-40"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[240px] p-0">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>{' '}
          {/* Accessibility */}
          <SidebarContent pathname={pathname} setOpen={setOpen} />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div
        className={cn(
          'hidden md:flex h-screen w-64 flex-col border-r bg-background',
          className
        )}
      >
        <SidebarContent pathname={pathname} />
      </div>
    </>
  );
}

export default Sidebar;
