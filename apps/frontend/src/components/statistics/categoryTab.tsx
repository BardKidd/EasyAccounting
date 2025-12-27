'use client';

import { useEffect, useMemo, useState } from 'react';
import { DonutChart } from './charts/donutChart';
import { CategoryList } from './lists/categoryList';
import { StatisticsLegend } from './common/statisticsLegend';
import { StatisticsType, STATISTICS_CONFIG } from './constants';
import AnimateLayout from './common/animateLayout';
import { CategoryTabDataType, MainType, PeriodType } from '@repo/shared';
import services from '@/services';

interface CategoryTabProps {
  periodDate: {
    startDate: string;
    endDate: string;
  };
  periodType: PeriodType;
}

type CategoryTabData = Record<
  Exclude<StatisticsType, StatisticsType.BALANCE>,
  CategoryTabDataType[]
>;

// 不用顯示餘額，所以跟其他 Tab 不太一樣
const LEGENDS = [
  StatisticsType.EXPENSE,
  StatisticsType.INCOME,
  StatisticsType.TRANSFER_IN,
  StatisticsType.TRANSFER_OUT,
].map((type) => ({
  key: type,
  label: STATISTICS_CONFIG[type].label,
  color: STATISTICS_CONFIG[type].legendColor,
}));

export function CategoryTab({ periodDate, periodType }: CategoryTabProps) {
  const [selectedType, setSelectedType] = useState<
    Exclude<StatisticsType, StatisticsType.BALANCE>
  >(StatisticsType.EXPENSE);
  const [categoryTabData, setCategoryTabData] = useState<CategoryTabData>({
    [StatisticsType.INCOME]: [],
    [StatisticsType.EXPENSE]: [],
    [StatisticsType.TRANSFER_IN]: [],
    [StatisticsType.TRANSFER_OUT]: [],
  });

  const totalAmount = useMemo(() => {
    return categoryTabData[selectedType].reduce(
      (sum, item) => sum + item.amount,
      0
    );
  }, [categoryTabData, selectedType]);

  const chartData = useMemo(() => {
    return categoryTabData[selectedType].map((item) => ({
      name: item.name,
      value: item.amount,
      color: item.color,
      type: item.type,
    }));
  }, [categoryTabData, selectedType]);

  const listData = useMemo(() => {
    return categoryTabData[selectedType];
  }, [categoryTabData, selectedType]);

  useEffect(() => {
    const fetchAllData = async () => {
      const [fetchedData] = await Promise.all([
        services.getCategoryTabData(periodDate.startDate, periodDate.endDate),
      ]);
      const newData: CategoryTabData = {
        [StatisticsType.INCOME]: [],
        [StatisticsType.EXPENSE]: [],
        [StatisticsType.TRANSFER_IN]: [],
        [StatisticsType.TRANSFER_OUT]: [],
      };
      fetchedData.forEach((item: CategoryTabDataType) => {
        if (item.isTransfer && item.type === MainType.EXPENSE) {
          newData[StatisticsType.TRANSFER_OUT].push(item);
        } else if (item.isTransfer && item.type === MainType.INCOME) {
          newData[StatisticsType.TRANSFER_IN].push(item);
        } else if (!item.isTransfer && item.type === MainType.EXPENSE) {
          newData[StatisticsType.EXPENSE].push(item);
        } else if (!item.isTransfer && item.type === MainType.INCOME) {
          newData[StatisticsType.INCOME].push(item);
        }
      });
      setCategoryTabData(newData);
    };

    fetchAllData();
  }, [periodDate, periodType]);

  useEffect(() => {
    console.log(categoryTabData);
  }, [selectedType]);

  return (
    <AnimateLayout>
      <StatisticsLegend
        options={LEGENDS}
        isSelected={(key) => selectedType === key}
        onToggle={(key) =>
          setSelectedType(
            key as Exclude<StatisticsType, StatisticsType.BALANCE>
          )
        }
      />

      <DonutChart data={chartData} totalAmount={totalAmount} />

      <CategoryList
        items={listData}
        totalAmount={totalAmount}
        type={selectedType}
      />
    </AnimateLayout>
  );
}
