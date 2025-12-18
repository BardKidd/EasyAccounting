'use client';

import { useState } from 'react';
import { Container } from '@/components/ui/container';
import { StatisticsHeader } from '@/components/statistics/statisticsHeader';

import { OverviewTab } from '@/components/statistics/overviewTab';
import { DetailsTab } from '@/components/statistics/detailsTab';
import { CategoryTab } from '@/components/statistics/categoryTab';
import { RankingTab } from '@/components/statistics/rankingTab';
import { AccountTab } from '@/components/statistics/accountTab';
import { PeriodType } from '@repo/shared';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function StatisticsPage() {
  const [periodType, setPeriodType] = useState<PeriodType>(PeriodType.MONTH);
  const [date, setDate] = useState<Date>(new Date());

  return (
    <Container title="統計報表">
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
            <OverviewTab />
          </TabsContent>
          <TabsContent value="details">
            <DetailsTab />
          </TabsContent>
          <TabsContent value="category">
            <CategoryTab />
          </TabsContent>

          <TabsContent value="ranking">
            <RankingTab />
          </TabsContent>
          <TabsContent value="account">
            <AccountTab />
          </TabsContent>
        </Tabs>
      </div>
    </Container>
  );
}
