'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Receipt,
  PieChart,
  Settings,
  Wallet,
} from 'lucide-react';

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
    title: '報表分析',
    href: '/reports',
    icon: PieChart,
  },
  {
    title: '設定',
    href: '/settings',
    icon: Settings,
  },
];

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <div className={cn('pb-12 min-h-screen border-r bg-background', className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <div className="mb-2 px-4 flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            <h2 className="text-lg font-semibold tracking-tight">
              EasyAccounting
            </h2>
          </div>
          <div className="space-y-1">
            {sidebarItems.map((item) => (
              <Button
                key={item.href}
                variant={pathname === item.href ? 'secondary' : 'ghost'}
                className="w-full justify-start"
                asChild
              >
                <Link href={item.href}>
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.title}
                </Link>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
