import { BudgetCycleType, BudgetAttributes } from '@/models/budget';

export interface Period {
  start: Date;
  end: Date;
}

/**
 * 取得指定日期所屬的週期
 */
export function getCurrentPeriod(
  budget: Pick<BudgetAttributes, 'cycleType' | 'cycleStartDay' | 'startDate'>,
  referenceDate: Date,
): Period {
  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);

  switch (budget.cycleType) {
    case BudgetCycleType.DAY:
      return { start: ref, end: ref };

    case BudgetCycleType.WEEK:
      return getWeekPeriod(ref, budget.cycleStartDay);

    case BudgetCycleType.MONTH:
      return getMonthPeriod(ref, budget.cycleStartDay);

    case BudgetCycleType.YEAR:
      return getYearPeriod(ref, budget.startDate);

    default:
      throw new Error(`Unknown cycleType: ${(budget as any).cycleType}`);
  }
}

/**
 * 取得上一週期
 */
export function getPreviousPeriod(
  budget: Pick<BudgetAttributes, 'cycleType' | 'cycleStartDay' | 'startDate'>,
  currentPeriodStart: Date,
): Period {
  const prevRef = new Date(currentPeriodStart);
  prevRef.setDate(prevRef.getDate() - 1);
  return getCurrentPeriod(budget, prevRef);
}

/**
 * 週週期計算
 * cycleStartDay: 1=週一, 7=週日
 */
function getWeekPeriod(ref: Date, cycleStartDay: number): Period {
  const dayOfWeek = ref.getDay(); // 0=Sun, 1=Mon, ...
  // 轉換成 1=Mon, 7=Sun
  const currentDay = dayOfWeek === 0 ? 7 : dayOfWeek;
  const diff = currentDay - cycleStartDay;
  const adjustedDiff = diff >= 0 ? diff : diff + 7;

  const start = new Date(ref);
  start.setDate(ref.getDate() - adjustedDiff);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return { start, end };
}

/**
 * 月週期計算
 * cycleStartDay: 1-31，超過當月天數則取當月最後一天
 */
function getMonthPeriod(ref: Date, cycleStartDay: number): Period {
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const dayOfMonth = ref.getDate();

  // 計算當月的起始日（考慮月份天數）
  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
  const actualStartDay = Math.min(cycleStartDay, daysInCurrentMonth);

  let periodStart: Date;
  let periodEnd: Date;

  if (dayOfMonth >= actualStartDay) {
    // 週期起始日在當月
    periodStart = new Date(year, month, actualStartDay);
    // 計算下個月的起始日作為結束日前一天
    const nextMonth = month + 1;
    const daysInNextMonth = new Date(year, nextMonth + 1, 0).getDate();
    const nextStartDay = Math.min(cycleStartDay, daysInNextMonth);
    periodEnd = new Date(year, nextMonth, nextStartDay - 1);
  } else {
    // 週期起始日在上個月
    const prevMonth = month - 1;
    const daysInPrevMonth = new Date(year, prevMonth + 1, 0).getDate();
    const prevStartDay = Math.min(cycleStartDay, daysInPrevMonth);
    periodStart = new Date(year, prevMonth, prevStartDay);
    periodEnd = new Date(year, month, actualStartDay - 1);
  }

  return { start: periodStart, end: periodEnd };
}

/**
 * 年週期計算
 * 使用 startDate 的月日作為每年的起始日
 * 例如 startDate = 2026-04-01，則年度週期為 4/1 ~ 次年 3/31
 */
function getYearPeriod(ref: Date, startDate: string): Period {
  const sd = new Date(startDate);
  const startMonth = sd.getMonth(); // 0-indexed
  const startDay = sd.getDate();

  const year = ref.getFullYear();
  const refMonth = ref.getMonth();
  const refDay = ref.getDate();

  // 判斷 ref 是否在當年的週期起始日之後
  const isAfterStart =
    refMonth > startMonth || (refMonth === startMonth && refDay >= startDay);

  let periodStart: Date;
  let periodEnd: Date;

  if (isAfterStart) {
    // 週期從今年的起始日開始
    periodStart = new Date(year, startMonth, startDay);
    // 結束於明年起始日前一天
    periodEnd = new Date(year + 1, startMonth, startDay - 1);
    // 處理跨月邊界（如 3/0 = 2月最後一天）
    if (startDay === 1) {
      periodEnd = new Date(year + 1, startMonth, 0); // 上個月最後一天
    }
  } else {
    // 週期從去年的起始日開始
    periodStart = new Date(year - 1, startMonth, startDay);
    // 結束於今年起始日前一天
    periodEnd = new Date(year, startMonth, startDay - 1);
    if (startDay === 1) {
      periodEnd = new Date(year, startMonth, 0);
    }
  }

  return { start: periodStart, end: periodEnd };
}
