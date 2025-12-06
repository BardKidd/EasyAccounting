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
import { apiHandler } from '@/lib/utils';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Progress } from '@/components/ui/progress';
import { useMemo, useState } from 'react';
import stores from '@/stores';

export function Header() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const user = stores.useUserStore();

  const handleLogout = () => {
    simplifyTryCatch(async () => {
      const url = '/logout';
      const result = await apiHandler(url, 'post', null);
      if (result.isSuccess) {
        stores.useUserStore.getState().clearUser();
        toast.success(result.message);
        router.push('/login');
      }
    }, setIsLoading);
  };

  const getFirstLetterAsAvatar = useMemo(() => {
    return user.name.charAt(0).toUpperCase();
  }, [user.name]);

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 md:px-6 gap-4">
        <div className="ml-auto flex items-center gap-4">
          <ModeToggle />
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Bell className="h-4 w-4" />
            <span className="sr-only">Toggle notifications</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-full border-2 border-primary/50 bg-secondary p-0 font-bold hover:bg-secondary/80 hover:text-primary cursor-pointer"
              >
                {getFirstLetterAsAvatar}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user.name}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                個人檔案
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                設定
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 cursor-pointer"
                onClick={handleLogout}
              >
                登出
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {isLoading && <Progress value={isLoading ? 100 : 0} />}
    </header>
  );
}
