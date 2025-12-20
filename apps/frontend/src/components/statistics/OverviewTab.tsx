'use client';

import {
  OverviewTop3CategoriesType,
  OverviewTop3ExpensesType,
  OverviewTrendType,
  PeriodType,
} from '@repo/shared';
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

export function OverviewTab({ periodDate, periodType }: OverviewTabProps) {
  const [overviewTrend, setOverviewTrend] = useState<OverviewTrendType>({
    income: 0,
    expense: 0,
    transferIn: 0,
    transferOut: 0,
    balance: 0,
  });
  const [overviewTop3Categories, setOverviewTop3Categories] = useState<
    OverviewTop3CategoriesType[]
  >([]);
  const [overviewTop3Expenses, setOverviewTop3Expenses] = useState<
    OverviewTop3ExpensesType[]
  >([]);

  const getOverviewTrendData = async () => {
    const result = await services.getOverviewTrend(
      periodDate.startDate,
      periodDate.endDate
    );
    return result;
  };

  const getOverviewTop3CategoriesData = async () => {
    const result = await services.getOverviewTop3Categories(
      periodDate.startDate,
      periodDate.endDate
    );

    return result;
  };

  const getOverviewTop3ExpensesData = async () => {
    const result = await services.getOverviewTop3Expenses(
      periodDate.startDate,
      periodDate.endDate
    );

    return result;
  };

  useEffect(() => {
    // 防止重複渲染
    const fetchAllData = async () => {
      const [
        overviewTrendData,
        overviewTop3CategoriesData,
        overviewTop3ExpensesData,
      ] = await Promise.all([
        getOverviewTrendData(),
        getOverviewTop3CategoriesData(),
        getOverviewTop3ExpensesData(),
      ]);

      setOverviewTrend(overviewTrendData);
      setOverviewTop3Categories(overviewTop3CategoriesData);
      setOverviewTop3Expenses(overviewTop3ExpensesData);
    };
    fetchAllData();
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
            categories={overviewTop3Categories}
          />
        </div>
        <div className="lg:col-span-1">
          <TopExpensesList items={overviewTop3Expenses} />
        </div>
      </section>
    </AnimateLayout>
  );
}
