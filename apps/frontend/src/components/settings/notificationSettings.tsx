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
import { useState } from 'react';

export function NotificationSettings() {
  const [dailyReminder, setDailyReminder] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(false);
  const [monthlyAnalysis, setMonthlyAnalysis] = useState(true);

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>通知設定</CardTitle>
          <CardDescription>管理您的應用程式通知</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between space-x-2">
            <Label
              htmlFor="daily-reminder"
              className="flex flex-col space-y-1 text-left items-start"
            >
              <span>每日記帳提醒</span>
              <span className="font-normal text-xs text-muted-foreground">
                每天晚上 9 點提醒您記錄今日開銷
              </span>
            </Label>
            <Switch
              id="daily-reminder"
              checked={dailyReminder}
              onCheckedChange={setDailyReminder}
            />
          </div>
          <div className="flex items-center justify-between space-x-2">
            <Label
              htmlFor="weekly-report"
              className="flex flex-col space-y-1 text-left items-start"
            >
              <span>每週摘要</span>
              <span className="font-normal text-xs text-muted-foreground">
                每週日寄送本週收支摘要
              </span>
            </Label>
            <Switch
              id="weekly-report"
              checked={weeklyReport}
              onCheckedChange={setWeeklyReport}
            />
          </div>
          <div className="flex items-center justify-between space-x-2">
            <Label
              htmlFor="monthly-analysis"
              className="flex flex-col space-y-1 text-left items-start"
            >
              <span>月度分析報告</span>
              <span className="font-normal text-xs text-muted-foreground">
                每月初提供上個月的詳細分析報告
              </span>
            </Label>
            <Switch
              id="monthly-analysis"
              checked={monthlyAnalysis}
              onCheckedChange={setMonthlyAnalysis}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
