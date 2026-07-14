'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, BellRing, Smartphone } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

/**
 * Web Push 推播開關（spec §6）。iOS 僅 standalone（加到主畫面）可用，故：
 *  - 不支援 → 不顯示。
 *  - 支援但非 standalone → 灰態 + 提示先加到主畫面。
 *  - 後端未設 VAPID → 灰態 + 提示伺服器未啟用。
 * 開關 = 即時訂閱 / 取消（非 email 偏好那種按鈕儲存）。
 */
export function PushNotificationCard() {
  const {
    supported,
    standalone,
    configured,
    subscribed,
    busy,
    enable,
    disable,
  } = usePushNotifications();

  // 完全不支援的環境（如舊瀏覽器）直接不顯示，避免干擾。
  if (!supported) return null;

  const blockedReason = !configured
    ? '伺服器尚未啟用推播服務'
    : !standalone
      ? '請先透過 Safari「分享 → 加入主畫面」，再從主畫面開啟以啟用推播'
      : null;

  const disabled = busy || !!blockedReason;

  return (
    <Card className="rounded-3xl bg-white/60 dark:bg-[#0f172a]/60 backdrop-blur-2xl border-slate-200/50 dark:border-white/10 shadow-xl overflow-hidden transition-all duration-300">
      <CardHeader className="border-b border-slate-200/50 dark:border-white/10 p-6">
        <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-800 dark:text-slate-100">
          <BellRing className="h-5 w-5 text-emerald-500" />
          裝置推播通知
        </CardTitle>
        <CardDescription className="text-slate-500 dark:text-slate-400">
          在此裝置接收記帳提醒推播（iOS 需先加到主畫面）
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-3 rounded-lg p-3 transition-colors hover:bg-muted/30">
          <Label
            htmlFor="push-toggle"
            className="flex flex-col items-start space-y-1.5 text-left"
          >
            <span className="text-base font-medium">開啟推播通知</span>
            <span className="text-sm font-normal text-muted-foreground/80">
              {subscribed
                ? '此裝置已訂閱推播'
                : blockedReason ?? '每日記帳提醒將以系統通知推送到此裝置'}
            </span>
          </Label>
          <div className="flex shrink-0 items-center gap-2">
            {busy && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            <Switch
              id="push-toggle"
              checked={subscribed}
              disabled={disabled}
              onCheckedChange={(checked) => (checked ? enable() : disable())}
              className="data-[state=checked]:bg-emerald-500"
            />
          </div>
        </div>

        {blockedReason && !subscribed && (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
            <Smartphone className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {blockedReason}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
