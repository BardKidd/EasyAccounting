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
import { Bell, UserPlus, MessageSquare } from 'lucide-react';
import { simplifyTryCatch, cn } from '@/lib/utils';
import { getReconciliationNotifications } from '@/services/reconciliationService';
import { logout } from '@/services/authService';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { ElegantLoader } from '@/components/ui/elegant-loader';
import { useMemo, useState, useEffect } from 'react';
import { GuestLogoutDialog } from '@/components/auth/guest-logout-dialog';
import { PromoteDialog } from '@/components/auth/promote-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useChatState } from '@/contexts/chatContext';

export function Header() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<{
    name: string;
    email: string;
    isGuest?: boolean;
  }>({
    name: '',
    email: '',
    isGuest: false,
  });
  const { toggleChat, isChatOpen } = useChatState();

  // Guest-specific dialog states
  const [showGuestLogout, setShowGuestLogout] = useState(false);
  const [showPromote, setShowPromote] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, []);

  const isGuest = user.isGuest === true;

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
    // 訪客登出走特殊流程
    if (isGuest) {
      setShowGuestLogout(true);
      return;
    }

    simplifyTryCatch(async () => {
      const result = await logout();
      if (result.isSuccess) {
        localStorage.removeItem('user');
        toast.success(result.message);
        window.location.href = '/login';
      }
    }, setIsLoading);
  };

  const getFirstLetterAsAvatar = useMemo(() => {
    if (isGuest) return 'G';
    return user.name.charAt(0).toUpperCase();
  }, [user.name, isGuest]);

  const displayName = isGuest ? '訪客用戶' : user.name;
  const displayEmail = isGuest ? '尚未註冊' : user.email;

  return (
    <>
      <header className="sticky top-4 z-50 mx-4 md:mr-8 mt-4 rounded-2xl border border-slate-200/50 dark:border-white/10 bg-white/60 dark:bg-[#0f172a]/60 backdrop-blur-2xl shadow-lg shadow-slate-200/20 dark:shadow-black/20 transition-all duration-300 hover:shadow-xl group">
        <div className="absolute inset-0 bg-linear-to-br from-white/40 to-white/0 dark:from-white/5 dark:to-transparent pointer-events-none rounded-2xl" />
        <div className="flex h-16 items-center px-6 gap-4 relative z-10">
          {/* Breadcrumbs or Page Title could go here in future */}
          <div className="flex-1">
            {/* Placeholder for potential breadcrumbs */}
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <ModeToggle />

            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 cursor-pointer relative rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              onClick={() => router.push('/reconciliation')}
            >
              <Bell className="h-5 w-5 text-slate-500 dark:text-slate-400" />
              {notificationCount > 0 && (
                <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] ring-2 ring-white dark:ring-[#0f172a] animate-pulse" />
              )}
              <span className="sr-only">Toggle notifications</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-10 w-10 cursor-pointer relative rounded-full transition-colors",
                isChatOpen 
                  ? "bg-emerald-100/50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400" 
                  : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
              )}
              onClick={toggleChat}
            >
              <MessageSquare className="h-5 w-5" />
              <span className="sr-only">Toggle AI Chat</span>
            </Button>

            <div className="h-8 w-px bg-slate-200 dark:bg-white/10 mx-1 hidden md:block"></div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full border border-slate-200/50 dark:border-white/10 p-0 font-bold hover:scale-105 transition-all cursor-pointer ring-offset-background focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 overflow-hidden shadow-sm"
                >
                  <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-emerald-500 to-teal-400 text-white shadow-inner">
                    {getFirstLetterAsAvatar}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-60 rounded-xl shadow-xl border-border bg-popover/95 backdrop-blur-md"
                align="end"
                forceMount
              >
                <DropdownMenuLabel className="font-normal p-4">
                  <div className="flex flex-col space-y-1">
                    <p className="text-base font-semibold leading-none tracking-wide text-foreground">
                      {displayName}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {displayEmail}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border" />

                {/* Guest CTA: 註冊以保存資料 */}
                {isGuest && (
                  <>
                    <DropdownMenuItem
                      className="cursor-pointer py-2.5 px-3 focus:bg-emerald-500/10 focus:text-emerald-600 dark:focus:text-emerald-400 rounded-md m-1 font-medium"
                      onClick={() => setShowPromote(true)}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      註冊以永久保存資料
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-border" />
                  </>
                )}

                {!isGuest && (
                  <>
                    <DropdownMenuItem className="cursor-pointer py-2.5 px-3 focus:bg-accent focus:text-accent-foreground rounded-md m-1">
                      個人檔案
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer py-2.5 px-3 focus:bg-accent focus:text-accent-foreground rounded-md m-1">
                      設定
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-border" />
                  </>
                )}

                <DropdownMenuItem
                  className="text-destructive cursor-pointer py-2.5 px-3 focus:bg-destructive/10 rounded-md m-1 focus:text-destructive"
                  onClick={handleLogout}
                >
                  登出
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      {isLoading && <ElegantLoader message="登出中..." />}

      {/* Guest Dialogs */}
      <GuestLogoutDialog
        open={showGuestLogout}
        onOpenChange={setShowGuestLogout}
      />
      <PromoteDialog open={showPromote} onOpenChange={setShowPromote} />
    </>
  );
}

export default Header;
