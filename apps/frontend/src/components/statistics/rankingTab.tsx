'use client';

import { useEffect, useMemo, useState } from 'react';
import { RankingList } from './lists/rankingList';
import { RootType, PeriodType } from '@repo/shared';
import { StatisticsLegend } from './common/statisticsLegend';
import { StatisticsType, STATISTICS_CONFIG } from './constants';
import AnimateLayout from './common/animateLayout';
import { RankingTabDataType } from '@repo/shared';
import services from '@/services';

interface RankingTabProps {
  periodDate: {
    startDate: string;
    endDate: string;
  };
  periodType: PeriodType;
}

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

export function RankingTab({ periodDate, periodType }: RankingTabProps) {
  const [selectedType, setSelectedType] = useState<StatisticsType>(
    StatisticsType.EXPENSE
  );
  const [rankingList, setRankingList] = useState<RankingTabDataType[]>([]);

  const currentSelectedTypeData = useMemo(() => {
    if (rankingList.length > 0) {
      if (selectedType === StatisticsType.TRANSFER_IN) {
        return rankingList.filter(
          (item) => item.type === RootType.INCOME && item.isTransfer
        );
      } else if (selectedType === StatisticsType.TRANSFER_OUT) {
        return rankingList.filter(
          (item) => item.type === RootType.EXPENSE && item.isTransfer
        );
      } else if (selectedType === StatisticsType.INCOME) {
        return rankingList.filter(
          (item) => item.type === RootType.INCOME && !item.isTransfer
        );
      } else if (selectedType === StatisticsType.EXPENSE) {
        return rankingList.filter(
          (item) => item.type === RootType.EXPENSE && !item.isTransfer
        );
      } else {
        return [];
      }
    } else {
      return [];
    }
  }, [selectedType, rankingList]);

  useEffect(() => {
    const getRankingList = async () => {
      const result = await services.getRankingTabData(
        periodDate.startDate,
        periodDate.endDate
      );
      setRankingList(result);
    };
    getRankingList();
  }, [periodDate, periodType]);

  return (
    <AnimateLayout>
      <StatisticsLegend
        options={LEGENDS}
        isSelected={(key) => selectedType === key}
        onToggle={(key) => setSelectedType(key as StatisticsType)}
      />

      <RankingList transactions={currentSelectedTypeData} />
    </AnimateLayout>
  );
}
