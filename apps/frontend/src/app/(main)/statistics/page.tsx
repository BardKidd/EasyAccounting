'use client';

import { useState } from 'react';
import { Container } from '@/components/ui/container';
import { StatisticsHeader } from '@/components/statistics/StatisticsHeader';
import { OverviewTab } from '@/components/statistics/OverviewTab';
import { PeriodType } from '@repo/shared';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Hammer } from 'lucide-react';

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
            <Card>
              <CardContent className="pt-12 pb-12 flex flex-col items-center justify-center text-muted-foreground gap-4 min-h-[300px]">
                <div className="p-4 rounded-full bg-muted/50">
                  <Hammer className="w-8 h-8 opacity-60" />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="font-semibold text-lg">功能開發中</h3>
                  <p className="text-sm">明細功能正在努力建設中，敬請期待...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="category">
            <Card>
              <CardContent className="pt-12 pb-12 flex flex-col items-center justify-center text-muted-foreground gap-4 min-h-[300px]">
                <div className="p-4 rounded-full bg-muted/50">
                  <Hammer className="w-8 h-8 opacity-60" />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="font-semibold text-lg">功能開發中</h3>
                  <p className="text-sm">明細功能正在努力建設中，敬請期待...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="ranking">
            <Card>
              <CardContent className="pt-12 pb-12 flex flex-col items-center justify-center text-muted-foreground gap-4 min-h-[300px]">
                <div className="p-4 rounded-full bg-muted/50">
                  <Hammer className="w-8 h-8 opacity-60" />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="font-semibold text-lg">功能開發中</h3>
                  <p className="text-sm">明細功能正在努力建設中，敬請期待...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="account">
            <Card>
              <CardContent className="pt-12 pb-12 flex flex-col items-center justify-center text-muted-foreground gap-4 min-h-[300px]">
                <div className="p-4 rounded-full bg-muted/50">
                  <Hammer className="w-8 h-8 opacity-60" />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="font-semibold text-lg">功能開發中</h3>
                  <p className="text-sm">明細功能正在努力建設中，敬請期待...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Container>
  );
}
