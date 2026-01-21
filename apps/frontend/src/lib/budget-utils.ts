import { Budget, BudgetCycleType } from '@/types/budget';
import {
  addDays,
  addMonths,
  differenceInDays,
  endOfDay,
  getDate,
  getDay,
  getDaysInMonth,
  lastDayOfMonth,
  setDate,
  subDays,
  subMonths,
} from 'date-fns';

/**
 * 計算預算週期的剩餘天數
 * @param budget 預算物件
 * @returns 剩餘天數 (包含今天)，若回傳 0 代表今天是最後一天
 */
export function getDaysRemaining(budget: Budget): number {
  if (!budget) return 0;

  const now = new Date();
  const periodEnd = getPeriodEnd(budget, now);

  // 計算相差天數
  // differenceInDays(later, earlier)
  // 如果截止是今天 23:59:59，現在是今天 10:00，diff = 0
  const diff = differenceInDays(periodEnd, now);

  // 保持非負數
  return Math.max(0, diff);
}

/**
 * 取得當前週期的結束時間 (End of Day)
 */
function getPeriodEnd(budget: Budget, referenceDate: Date): Date {
  const { cycleType, cycleStartDay } = budget;
  const refDate = new Date(referenceDate);

  switch (cycleType) {
    case BudgetCycleType.DAY:
      return endOfDay(refDate);

    case BudgetCycleType.WEEK: {
      // cycleStartDay: 1=週一, ..., 7=週日
      // date-fns getDay: 0=週日, 1=週一, ...
      const currentDay = getDay(refDate);
      const currentDayAdjusted = currentDay === 0 ? 7 : currentDay; // 轉為 1-7

      // 計算目前這週距離起始日過了幾天
      // 例如：今天是週三(3)，起始日週一(1) -> 過了 2 天
      // 例如：今天是週日(7)，起始日週一(1) -> 過了 6 天
      // 例如：今天是週一(1)，起始日週三(3) -> 起始日是上週三 -> 距離上週三過了 1+7-3 = 5 天

      let daysFromStart = currentDayAdjusted - cycleStartDay;
      if (daysFromStart < 0) {
        daysFromStart += 7;
      }

      // 週期起始日
      const periodStart = subDays(refDate, daysFromStart);
      // 週期結束日 = 起始日 + 6 天
      const periodEnd = addDays(periodStart, 6);

      return endOfDay(periodEnd);
    }

    case BudgetCycleType.MONTH: {
      // logic:
      // 1. 取得本月候選起始日 (clamped to last day of month)
      const thisMonthStart = getClampedDate(refDate, cycleStartDay);

      let finalPeriodEnd: Date;

      if (refDate < thisMonthStart) {
        // 今天比本月起始日還早 -> 屬於上個週期 (上個月起始日 ~ 本月起始日前一天)
        // 週期結束日 = 本月起始日 - 1 天
        finalPeriodEnd = subDays(thisMonthStart, 1);
      } else {
        // 今天在本月起始日之後 -> 屬於本週期 (本月起始日 ~ 下個月起始日前一天)
        // 週期結束日 = 下個月起始日 - 1 天
        const nextMonthDate = addMonths(refDate, 1);
        const nextMonthStart = getClampedDate(nextMonthDate, cycleStartDay);
        finalPeriodEnd = subDays(nextMonthStart, 1);
      }

      return endOfDay(finalPeriodEnd);
    }

    case BudgetCycleType.YEAR: {
      // 年度預算固定 1/1 ~ 12/31
      const yearEnd = new Date(refDate.getFullYear(), 11, 31);
      return endOfDay(yearEnd);
    }

    default:
      return endOfDay(refDate);
  }
}

/**
 * 取得指定月份的起始日，若 day 超過該月天數則取最後一天
 */
function getClampedDate(date: Date, day: number): Date {
  const daysInMonth = getDaysInMonth(date);
  const targetDay = Math.min(day, daysInMonth);
  return setDate(date, targetDay);
}
