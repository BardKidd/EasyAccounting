'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ModeToggle } from '@/components/mode-toggle';
import { Bell } from 'lucide-react';
import { simplifyTryCatch } from '@/lib/utils';
import { getReconciliationNotifications } from '@/services/reconciliationService';
import { logout } from '@/services/authService';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Progress } from '@/components/ui/progress';
import { useMemo, useState, useEffect } from 'react';

function Header() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string }>({
    name: '',
    email: '',
  });

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, []);

  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await getReconciliationNotifications();
        if (res.isSuccess && Array.isArray(res.data)) {
          setNotificationCount(res.data.length);
        }
      } catch (error) {
        console.error('Failed to fetch notifications', error);
      }
    };
    fetchNotifications();
  }, []);

  const handleLogout = () => {
    simplifyTryCatch(async () => {
      const result = await logout();
      if (result.isSuccess) {
        localStorage.removeItem('user');
        toast.success(result.message);
        router.push('/login');
      }
    }, setIsLoading);
  };

  const getFirstLetterAsAvatar = useMemo(() => {
    return user.name.charAt(0).toUpperCase();
  }, [user.name]);

  return (
    <header className="sticky top-4 z-50 mx-4 md:mr-8 mt-4 rounded-2xl border border-white/20 bg-background/70 backdrop-blur-xl shadow-lg supports-backdrop-filter:bg-background/40 transition-all duration-300 hover:bg-background/80 hover:shadow-xl">
      <div className="flex h-16 items-center px-6 gap-4">
        {/* Breadcrumbs or Page Title could go here in future */}
        <div className="flex-1">
          {/* Placeholder for potential breadcrumbs */}
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <ModeToggle />

          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 cursor-pointer relative rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            onClick={() => router.push('/reconciliation')}
          >
            <Bell className="h-5 w-5 text-muted-foreground" />
            {notificationCount > 0 && (
              <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-background animate-pulse" />
            )}
            <span className="sr-only">Toggle notifications</span>
          </Button>

          <div className="h-8 w-px bg-border/50 mx-1 hidden md:block"></div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-full border border-border/50 bg-secondary/30 p-0 font-bold hover:bg-secondary/50 transition-all cursor-pointer ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 overflow-hidden"
              >
                <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-indigo-500 to-purple-500 text-white shadow-inner">
                  {getFirstLetterAsAvatar}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-60 rounded-xl shadow-2xl border-white/10 bg-background/95 backdrop-blur-md"
              align="end"
              forceMount
            >
              <DropdownMenuLabel className="font-normal p-4">
                <div className="flex flex-col space-y-1">
                  <p className="text-base font-semibold leading-none font-playfair tracking-wide">
                    {user.name}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem className="cursor-pointer py-2.5 px-3 focus:bg-accent/50 rounded-md m-1">
                個人檔案
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer py-2.5 px-3 focus:bg-accent/50 rounded-md m-1">
                設定
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem
                className="text-rose-500 cursor-pointer py-2.5 px-3 focus:bg-rose-50 dark:focus:bg-rose-950/30 rounded-md m-1 focus:text-rose-600"
                onClick={handleLogout}
              >
                登出
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {isLoading && (
        <Progress
          value={isLoading ? 100 : 0}
          className="h-0.5 absolute bottom-0 w-full rounded-b-2xl"
        />
      )}
    </header>
  );
}

export default Header;
