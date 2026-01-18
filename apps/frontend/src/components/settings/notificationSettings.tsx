'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useState, useEffect, useMemo } from 'react';
import { PersonnelNotificationSchema } from '@repo/shared';
import { toast } from 'sonner';
import service from '@/services';
import { cn, getErrorMessage } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { UnsavedChangesDialog } from './unsavedChangesDialog';

export function NotificationSettings({
  notifications,
}: {
  notifications: PersonnelNotificationSchema;
}) {
  const router = useRouter();
  const [isDailyNotification, setIsDailyNotification] = useState(
    notifications.isDailyNotification,
  );
  const [isWeeklySummaryNotification, setIsWeeklySummaryNotification] =
    useState(notifications.isWeeklySummaryNotification);
  const [isMonthlyAnalysisNotification, setIsMonthlyAnalysisNotification] =
    useState(notifications.isMonthlyAnalysisNotification);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false); // 只有呼叫 API 成功才需要顯示
  const [navConfirmOpen, setNavConfirmOpen] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  // 判斷是否有變更但尚未儲存
  const isDirty = useMemo(() => {
    return (
      isDailyNotification !== notifications.isDailyNotification ||
      isWeeklySummaryNotification !==
        notifications.isWeeklySummaryNotification ||
      isMonthlyAnalysisNotification !==
        notifications.isMonthlyAnalysisNotification
    );
  }, [
    isDailyNotification,
    isWeeklySummaryNotification,
    isMonthlyAnalysisNotification,
    notifications,
  ]);

  useEffect(() => {
    if (showSuccess) {
      setShowSuccess(false);
    }
  }, [
    isDailyNotification,
    isWeeklySummaryNotification,
    isMonthlyAnalysisNotification,
  ]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload: PersonnelNotificationSchema = {
        isDailyNotification,
        isWeeklySummaryNotification,
        isMonthlyAnalysisNotification,
      };
      await service.updatePersonnelNotification(payload);
      toast.success('通知設定已更新');
      router.refresh();
      setShowSuccess(true);
    } catch (error) {
      console.error(error);
      toast.error(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmLeave = () => {
    if (pendingUrl) {
      setNavConfirmOpen(false);
      router.push(pendingUrl);
    }
  };

  const handleCancelLeave = () => {
    setNavConfirmOpen(false);
    setPendingUrl(null);
  };

  const handleReset = () => {
    setIsDailyNotification(notifications.isDailyNotification);
    setIsWeeklySummaryNotification(notifications.isWeeklySummaryNotification);
    setIsMonthlyAnalysisNotification(
      notifications.isMonthlyAnalysisNotification,
    );
    toast.info('已還原變更');
  };

  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ''; // 目前已經棄用，不過舊版本的瀏覽器還是有用。
    };

    // 在手動關掉分頁或重整時會跳出來。
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  // 攔截應用程式內的連結點擊
  useEffect(() => {
    if (!isDirty) return;

    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');

      if (anchor) {
        // 只攔截內部連結，排除 target="_blank" 或外部連結
        // 雖然現在根本沒有使用到 target="_blank"，未來也不確定，不過留下 !anchor.target 來好了...
        const href = anchor.getAttribute('href');
        if (href && href.startsWith('/') && !anchor.target) {
          e.preventDefault();
          e.stopPropagation();
          setPendingUrl(href);
          setNavConfirmOpen(true);
        }
      }
    };

    // 使用捕獲階段 (capture=true) 確保我們先攔截到
    document.addEventListener('click', handleAnchorClick, true);

    return () => {
      document.removeEventListener('click', handleAnchorClick, true);
    };
  }, [isDirty]);

  return (
    <div className="grid gap-6">
      <UnsavedChangesDialog
        isOpen={navConfirmOpen}
        onConfirm={handleConfirmLeave}
        onCancel={handleCancelLeave}
      />
      <Card className="backdrop-blur-xl bg-background/60 border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="border-b border-border/10 pb-4">
          <CardTitle className="text-xl font-semibold">通知設定</CardTitle>
          <CardDescription>管理您的應用程式通知</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="flex items-center justify-between space-x-2 p-3 hover:bg-muted/30 rounded-lg transition-colors">
            <Label
              htmlFor="daily-reminder"
              className="flex flex-col space-y-1.5 text-left items-start cursor-pointer"
            >
              <span className="font-medium text-base">每日記帳提醒</span>
              <span className="font-normal text-sm text-muted-foreground/80">
                每天晚上 9 點提醒您記錄今日開銷
              </span>
            </Label>
            <Switch
              id="daily-reminder"
              checked={isDailyNotification}
              onCheckedChange={setIsDailyNotification}
              className="data-[state=checked]:bg-primary"
            />
          </div>
          <div className="flex items-center justify-between space-x-2 p-3 hover:bg-muted/30 rounded-lg transition-colors">
            <Label
              htmlFor="weekly-report"
              className="flex flex-col space-y-1.5 text-left items-start cursor-pointer"
            >
              <span className="font-medium text-base">每週摘要</span>
              <span className="font-normal text-sm text-muted-foreground/80">
                每週一寄送上週收支摘要
              </span>
            </Label>
            <Switch
              id="weekly-report"
              checked={isWeeklySummaryNotification}
              onCheckedChange={setIsWeeklySummaryNotification}
              className="data-[state=checked]:bg-primary"
            />
          </div>
          <div className="flex items-center justify-between space-x-2 p-3 hover:bg-muted/30 rounded-lg transition-colors">
            <Label
              htmlFor="monthly-analysis"
              className="flex flex-col space-y-1.5 text-left items-start cursor-pointer"
            >
              <span className="font-medium text-base">月度分析報告</span>
              <span className="font-normal text-sm text-muted-foreground/80">
                每月初提供上個月的詳細分析報告
              </span>
            </Label>
            <Switch
              id="monthly-analysis"
              checked={isMonthlyAnalysisNotification}
              onCheckedChange={setIsMonthlyAnalysisNotification}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t border-border/10 bg-muted/5 px-6 py-4">
          <div className="flex items-center text-sm">
            {showSuccess ? (
              <span className="text-emerald-500 font-medium flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                所有變更已儲存
              </span>
            ) : isDirty ? (
              <span className="text-amber-500 font-medium flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                您有未儲存的變更
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            {isDirty && (
              <Button
                variant="ghost"
                onClick={handleReset}
                disabled={isSaving}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                還原
              </Button>
            )}
            <Button
              onClick={handleSave}
              className={cn(
                'cursor-pointer shadow-sm transition-all hover:shadow-md active:scale-95',
                isSaving && 'cursor-not-allowed',
              )}
              disabled={!isDirty || isSaving}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              儲存變更
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
