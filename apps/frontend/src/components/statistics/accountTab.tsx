'use client';

import { useEffect, useMemo, useState } from 'react';
import { DonutChart } from './charts/donutChart';
import { AccountList } from './lists/accountList';
import { StatisticsLegend } from './common/statisticsLegend';
import { StatisticsType, STATISTICS_CONFIG } from './constants';
import AnimateLayout from './common/animateLayout';
import services from '@/services';
import { AccountTabDataType, RootType, PeriodType } from '@repo/shared';

interface AccountTabProps {
  periodDate: {
    startDate: string;
    endDate: string;
  };
  periodType: PeriodType;
}

const LEGENDS = Object.values(StatisticsType).map((type) => ({
  key: type,
  label: STATISTICS_CONFIG[type].label,
  color: STATISTICS_CONFIG[type].legendColor,
}));

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function AccountTab({ periodDate, periodType }: AccountTabProps) {
  const [selectedType, setSelectedType] = useState<StatisticsType>(
    StatisticsType.EXPENSE
  );
  const [accountTabData, setAccountTabData] = useState<AccountTabDataType[]>(
    []
  );

  // 1. 先篩選資料
  const filteredItems = useMemo(() => {
    if (accountTabData.length > 0) {
      if (selectedType === StatisticsType.TRANSFER_IN) {
        return accountTabData.filter(
          (item) => item.isTransfer && item.type === RootType.INCOME
        );
      } else if (selectedType === StatisticsType.TRANSFER_OUT) {
        return accountTabData.filter(
          (item) => item.isTransfer && item.type === RootType.EXPENSE
        );
      } else if (selectedType === StatisticsType.EXPENSE) {
        return accountTabData.filter(
          (item) => !item.isTransfer && item.type === RootType.EXPENSE
        );
      } else if (selectedType === StatisticsType.INCOME) {
        return accountTabData.filter(
          (item) => !item.isTransfer && item.type === RootType.INCOME
        );
      } else {
        //! 總計
        return accountTabData;
      }
    } else {
      return [];
    }
  }, [accountTabData, selectedType]);

  // 2. 處理排序與顏色 (深淺變化)
  const coloredItems = useMemo(() => {
    return filteredItems.map((item, index) => {
      let color = item.color;

      if (selectedType === StatisticsType.BALANCE) {
        // Balance 模式維持原有的 紅/綠 區分
        if (item.type === RootType.INCOME) {
          // 收入(淺綠) & 轉入(深綠)
          color = item.isTransfer ? '#059669' : '#10b981';
        } else {
          // 支出(淺紅) & 轉出(深紅)
          color = item.isTransfer ? '#b91c1c' : '#ef4444';
        }
      } else if (STATISTICS_CONFIG[selectedType]) {
        // 其他模式：使用單色系深淺變化
        // 取得該類別的主色
        const baseColor = STATISTICS_CONFIG[selectedType].color;
        // 計算透明度：第一筆最深 (1.0)，之後遞減，最低 0.2
        // 公式可自訂，這裡假設最多 10 筆慢慢變淡
        const total = filteredItems.length;
        // 避免除以 0
        const ratio = total > 1 ? index / (total * 1.2) : 0;
        const opacity = 1 - ratio;
        color = hexToRgba(baseColor, opacity);
      }

      return {
        ...item,
        color,
      };
    });
  }, [filteredItems, selectedType]);

  const totalAmount = useMemo(() => {
    if (selectedType === StatisticsType.BALANCE) {
      // 收入＋轉入
      const income = coloredItems.filter(
        (item) => item.type === RootType.INCOME
      );
      // 支出＋轉出
      const expense = coloredItems.filter(
        (item) => item.type === RootType.EXPENSE
      );
      return (
        income.reduce((sum, item) => sum + item.amount, 0) -
        expense.reduce((sum, item) => sum + item.amount, 0)
      );
    }
    return coloredItems.reduce((sum, item) => sum + item.amount, 0);
  }, [selectedType, coloredItems]);

  const chartData = useMemo(() => {
    return coloredItems.map((item) => ({
      id: item.id,
      name: item.name,
      value: item.amount,
      color: item.color,
      type: item.type,
    }));
  }, [coloredItems]);

  useEffect(() => {
    const fetchData = async () => {
      const result = await services.getAccountTabData(
        periodDate.startDate,
        periodDate.endDate
      );
      setAccountTabData(result);
    };
    fetchData();
  }, [periodType, periodDate.startDate, periodDate.endDate]);

  return (
    <AnimateLayout>
      <StatisticsLegend
        options={LEGENDS}
        isSelected={(key) => selectedType === key}
        onToggle={(key) => setSelectedType(key as StatisticsType)}
      />

      <DonutChart data={chartData} totalAmount={totalAmount} />

      <AccountList
        items={coloredItems}
        totalAmount={totalAmount}
        type={selectedType}
      />
    </AnimateLayout>
  );
}
