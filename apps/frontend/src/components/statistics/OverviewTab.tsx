'use client';

import { OverviewTrendType, PeriodType } from '@repo/shared';
import { SummaryBarChart } from './charts/summaryBarChart';
import { TopCategoriesPie } from './charts/topCategoriesPie';
import { TopExpensesList } from './charts/topExpensesList';
import AnimateLayout from './common/animateLayout';
import services from '@/services';
import { useEffect, useState } from 'react';

interface OverviewTabProps {
  periodDate: {
    startDate: string;
    endDate: string;
  };
  periodType: PeriodType;
}

const MOCK_CATEGORIES = [
  { name: '飲食', amount: 15600, color: '#f43f5e' }, // rose-500
  { name: '購物', amount: 12400, color: '#3b82f6' }, // blue-500
  { name: '交通', amount: 5800, color: '#10b981' }, // emerald-500
];

const MOCK_EXPENSES = [
  {
    id: '1',
    category: '購物',
    note: 'iPhone 15 Case',
    date: '2025-12-15',
    amount: 1290,
  },
  {
    id: '2',
    category: '飲食',
    note: '王品牛排聚餐',
    date: '2025-12-14',
    amount: 3500,
  },
  {
    id: '3',
    category: '娛樂',
    note: 'Netflix 年度訂閱',
    date: '2025-12-10',
    amount: 2700,
  },
];

export function OverviewTab({ periodDate, periodType }: OverviewTabProps) {
  const [overviewTrend, setOverviewTrend] = useState<OverviewTrendType>({
    income: 0,
    expense: 0,
    transferIn: 0,
    transferOut: 0,
    balance: 0,
  });
  const getOverviewTrendData = async () => {
    const overviewTrend = await services.getOverviewTrend(
      periodDate.startDate,
      periodDate.endDate
    );

    setOverviewTrend(overviewTrend);
  };

  useEffect(() => {
    getOverviewTrendData();
  }, [periodDate, periodType]);
  return (
    <AnimateLayout>
      <section>
        <SummaryBarChart data={overviewTrend} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TopCategoriesPie
            totalExpense={overviewTrend.expense}
            categories={MOCK_CATEGORIES}
          />
        </div>
        <div className="lg:col-span-1">
          <TopExpensesList items={MOCK_EXPENSES} />
        </div>
      </section>
    </AnimateLayout>
  );
}
