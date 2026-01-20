'use client';

import { useMemo, useState } from 'react';
import { Container } from '@/components/ui/container';
// import { ExcelExportButton } from '@/components/common/ExcelExportButton';
// import { ExcelImportButton } from '@/components/common/ExcelImportButton';
/**
 * NOTE: import 路徑大小寫要與 Git 追蹤的檔名一致！
 * macOS case-insensitive，但 Vercel (Linux) case-sensitive。
 */
import { StatisticsHeader } from '@/components/statistics/statisticsHeader';

import { OverviewTab } from '@/components/statistics/overviewTab';
import { DetailsTab } from '@/components/statistics/detailsTab';
import { CategoryTab } from '@/components/statistics/categoryTab';
import { RankingTab } from '@/components/statistics/rankingTab';
import { AccountTab } from '@/components/statistics/accountTab';
import { PageType, PeriodType } from '@repo/shared';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from 'date-fns';

interface StatisticsClientProps {
  initialDate: number;
}

export function StatisticsClient({ initialDate }: StatisticsClientProps) {
  const [periodType, setPeriodType] = useState<PeriodType>(PeriodType.MONTH);
  // 防止水合
  const [date, setDate] = useState<Date>(new Date(initialDate));

  const today = useMemo(() => new Date(initialDate), [initialDate]);

  const periodDate = useMemo(() => {
    if (periodType === PeriodType.WEEK) {
      return {
        startDate: format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        endDate: format(endOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      };
    } else if (periodType === PeriodType.MONTH) {
      return {
        startDate: format(startOfMonth(date), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(date), 'yyyy-MM-dd'),
      };
    } else {
      return {
        startDate: format(startOfYear(date), 'yyyy-MM-dd'),
        endDate: format(endOfYear(date), 'yyyy-MM-dd'),
      };
    }
  }, [periodType, date]);

  return (
    <Container className="py-8 space-y-8 max-w-[1600px] px-4 md:px-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight bg-linear-to-r from-slate-900 to-slate-700 dark:from-white dark:to-white/60 bg-clip-text text-transparent font-playfair">
          統計報表
        </h2>
        <div className="flex items-center gap-2">
          {/* <ExcelImportButton type={PageType.STATISTICS} />
          <ExcelExportButton type={PageType.STATISTICS} /> */}
        </div>
      </div>

      <div className="space-y-6">
        <StatisticsHeader
          periodType={periodType}
          onPeriodChange={setPeriodType}
          date={date}
          onDateChange={setDate}
          today={today}
        />

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6 p-1 bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-white/5 rounded-2xl backdrop-blur-sm">
            <TabsTrigger
              value="overview"
              className="rounded-xl cursor-pointer data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-300 transition-all duration-300"
            >
              總覽
            </TabsTrigger>
            <TabsTrigger
              value="details"
              className="rounded-xl cursor-pointer data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-300 transition-all duration-300"
            >
              明細
            </TabsTrigger>
            <TabsTrigger
              value="category"
              className="rounded-xl cursor-pointer data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-300 transition-all duration-300"
            >
              類別
            </TabsTrigger>
            <TabsTrigger
              value="ranking"
              className="rounded-xl cursor-pointer data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-300 transition-all duration-300"
            >
              排行
            </TabsTrigger>
            <TabsTrigger
              value="account"
              className="rounded-xl cursor-pointer data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-300 transition-all duration-300"
            >
              帳戶
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab periodDate={periodDate} periodType={periodType} />
          </TabsContent>
          <TabsContent value="details">
            <DetailsTab periodDate={periodDate} periodType={periodType} />
          </TabsContent>
          <TabsContent value="category">
            <CategoryTab periodDate={periodDate} periodType={periodType} />
          </TabsContent>

          <TabsContent value="ranking">
            <RankingTab periodDate={periodDate} periodType={periodType} />
          </TabsContent>
          <TabsContent value="account">
            <AccountTab periodDate={periodDate} periodType={periodType} />
          </TabsContent>
        </Tabs>
      </div>
    </Container>
  );
}
