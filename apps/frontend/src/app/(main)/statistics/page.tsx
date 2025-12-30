'use client';

import { useMemo, useState } from 'react';
import { Container } from '@/components/ui/container';
import { ExcelExportButton } from '@/components/common/ExcelExportButton';
import { ExcelImportButton } from '@/components/common/ExcelImportButton';
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

function StatisticsPage() {
  const [periodType, setPeriodType] = useState<PeriodType>(PeriodType.MONTH);
  const [date, setDate] = useState<Date>(new Date());

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
    <Container className="py-8 space-y-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">統計報表</h2>
        <div className="flex items-center gap-2">
          <ExcelImportButton type={PageType.STATISTICS} />
          <ExcelExportButton type={PageType.STATISTICS} />
        </div>
      </div>

      <div className="space-y-6">
        <StatisticsHeader
          periodType={periodType}
          onPeriodChange={setPeriodType}
          date={date}
          onDateChange={setDate}
        />

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="overview" className="cursor-pointer">
              總覽
            </TabsTrigger>
            <TabsTrigger value="details" className="cursor-pointer">
              明細
            </TabsTrigger>
            <TabsTrigger value="category" className="cursor-pointer">
              類別
            </TabsTrigger>
            <TabsTrigger value="ranking" className="cursor-pointer">
              排行
            </TabsTrigger>
            <TabsTrigger value="account" className="cursor-pointer">
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

export default StatisticsPage;
