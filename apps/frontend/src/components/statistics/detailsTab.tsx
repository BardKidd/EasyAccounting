'use client';

import { useEffect, useState } from 'react';
import {
  DetailsTransaction,
  DetailTabDataType,
  MainType,
  PeriodType,
} from '@repo/shared';
import { TrendLineChart } from './charts/trendLineChart';
import { DailyTransactionList } from './lists/dailyTransactionList';
import { StatisticsLegend } from './common/statisticsLegend';
import { StatisticsType, STATISTICS_CONFIG } from './constants';
import AnimateLayout from './common/animateLayout';
import services from '@/services';
import { eachDayOfInterval, format } from 'date-fns';

interface DetailsTabProps {
  periodDate: {
    startDate: string;
    endDate: string;
  };
  periodType: PeriodType;
}

type GroupedSeriesType = {
  [StatisticsType.INCOME]: DetailTabDataType[];
  [StatisticsType.EXPENSE]: DetailTabDataType[];
  [StatisticsType.TRANSFER_IN]: DetailTabDataType[];
  [StatisticsType.TRANSFER_OUT]: DetailTabDataType[];
};

type DetailTabSeriesDataType = {
  [StatisticsType.INCOME]: number[];
  [StatisticsType.EXPENSE]: number[];
  [StatisticsType.TRANSFER_IN]: number[];
  [StatisticsType.TRANSFER_OUT]: number[];
};

const initialGroupedSeriesData: GroupedSeriesType = {
  [StatisticsType.INCOME]: [],
  [StatisticsType.EXPENSE]: [],
  [StatisticsType.TRANSFER_IN]: [],
  [StatisticsType.TRANSFER_OUT]: [],
};

const initialDetailTabSeriesData: DetailTabSeriesDataType = {
  [StatisticsType.INCOME]: [],
  [StatisticsType.EXPENSE]: [],
  [StatisticsType.TRANSFER_IN]: [],
  [StatisticsType.TRANSFER_OUT]: [],
};

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

const xAxisData = (
  periodType: PeriodType,
  startDate: string,
  endDate: string
) => {
  const date = new Date(startDate);
  const currentMonth = date.getMonth() + 1;
  const currentYear = date.getFullYear();
  switch (periodType) {
    case PeriodType.MONTH:
      // 取得這個月有幾天。currentMonth + 1 後在下面這個算法裡面是下個月，而 0 代表前一天的意思
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

      return Array.from(
        { length: daysInMonth },
        (_, i) =>
          `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
      );
    case PeriodType.YEAR:
      return Array.from(
        { length: 12 },
        (_, i) => `${currentYear}-${String(i + 1).padStart(2, '0')}`
      );
    case PeriodType.WEEK:
      return eachDayOfInterval({
        start: new Date(startDate),
        end: new Date(endDate),
      }).map((date) => format(date, 'yyyy-MM-dd'));
    default:
      return [];
  }
};

export function DetailsTab({ periodDate, periodType }: DetailsTabProps) {
  const [selectedLegends, setSelectedLegends] = useState<
    Record<string, boolean>
  >({
    [StatisticsType.INCOME]: false,
    [StatisticsType.EXPENSE]: true,
    [StatisticsType.TRANSFER_IN]: false,
    [StatisticsType.TRANSFER_OUT]: false,
    [StatisticsType.BALANCE]: false,
  });
  const [detailTabSeriesData, setDetailTabSeriesData] =
    useState<DetailTabSeriesDataType>(
      JSON.parse(JSON.stringify(initialDetailTabSeriesData))
    );

  const [detailTabTransactionList, setDetailTabTransactionList] = useState<
    DetailsTransaction[]
  >([]);
  const [xAxisData, setXAxisData] = useState<string[]>([]);

  const toggleLegend = (key: string) => {
    setSelectedLegends((prev) => {
      return {
        ...prev,
        [key]: !prev[key],
      };
    });
  };

  useEffect(() => {
    const fetchDetailsTabData = async () => {
      const [detailTabData] = await Promise.all([
        services.getDetailTabData(periodDate.startDate, periodDate.endDate),
      ]);
      // 初始化，確保不會包含上一次的 State
      const newSeriesGroup: GroupedSeriesType = JSON.parse(
        JSON.stringify(initialGroupedSeriesData)
      );
      const newSeriesData: DetailTabSeriesDataType = JSON.parse(
        JSON.stringify(initialDetailTabSeriesData)
      );
      const newTransactionList: DetailsTransaction[] = [];
      const newXAxisData: Set<string> = new Set();
      // =====

      if (detailTabData.length > 0) {
        // 後端給的是 DESC (最近的日期在前面)，我們需要 ASC (最近的日期在後面)
        // 使用 reverse() 把它反轉過來，這樣順序就是對的了
        // 且因為後端已經排序過，所以我們不需要再用 getTime() sort
        const reversedData = [...detailTabData].reverse();

        reversedData.forEach((item: DetailTabDataType) => {
          newXAxisData.add(item.date);
          // 先分組取好各種類別需要有的物件資料
          if (item.targetAccountId && item.type === MainType.EXPENSE) {
            newSeriesGroup[StatisticsType.TRANSFER_OUT].push(item);
          } else if (item.targetAccountId && item.type === MainType.INCOME) {
            newSeriesGroup[StatisticsType.TRANSFER_IN].push(item);
          } else if (item.type === MainType.EXPENSE) {
            newSeriesGroup[StatisticsType.EXPENSE].push(item);
          } else if (item.type === MainType.INCOME) {
            newSeriesGroup[StatisticsType.INCOME].push(item);
          }
        });

        const finalXAxisData = [...newXAxisData];
        // 分好組後需要取出所有資料的金額，並把同日期的金額加總
        Object.keys(newSeriesGroup).forEach((key) => {
          const typeKey = key as keyof GroupedSeriesType;
          const items = newSeriesGroup[typeKey];
          const dateAmountMap: Record<string, number> = {};

          // 把相同天數的金額加總 {'2025-12-15': 5824, ...}
          items.forEach((item) => {
            dateAmountMap[item.date] =
              (dateAmountMap[item.date] || 0) + item.amount;
          });

          // 找出對應的日期金額丟到 series 裡。newSeriesData.EXPENSE = [5824, ...]
          newSeriesData[typeKey] = finalXAxisData.map(
            (date) => dateAmountMap[date] || 0
          );
        });

        setDetailTabSeriesData(newSeriesData);
        setXAxisData(finalXAxisData);

        detailTabData.forEach((item) => {
          newTransactionList.push({
            id: item.id,
            date: item.date,
            amount: item.amount,
            type: item.type,
            categoryId: item.category.id,
            categoryName: item.category.name,
            categoryIcon: item.category.icon,
            categoryColor: item.category.color || '#999',
            description: item.description,
            accountName: item.account.name,
            targetAccountName: item.targetAccount.name,
          });
        });
        setDetailTabTransactionList(newTransactionList);
      } else {
        setDetailTabTransactionList([]);
        setDetailTabSeriesData(
          JSON.parse(JSON.stringify(initialDetailTabSeriesData))
        );
      }
    };
    fetchDetailsTabData();
  }, [periodDate, periodType]);

  return (
    <AnimateLayout>
      <StatisticsLegend
        options={LEGENDS}
        isSelected={(key) => !!selectedLegends[key]}
        onToggle={toggleLegend}
      />

      <TrendLineChart
        dates={xAxisData}
        seriesData={detailTabSeriesData}
        selectedSeries={selectedLegends}
      />

      <DailyTransactionList transactions={detailTabTransactionList} />
    </AnimateLayout>
  );
}
