/**
 * 預算純函式邏輯 — 零 DB 依賴，可用純 Jest 測試。
 *
 * 對應 spec §5.2 虛擬碼。
 */

import { roundToBaseCurrency } from '@repo/shared';
import type {
  BudgetEnvelopeRow,
  BudgetMonthView,
  BudgetRTABreakdown,
} from '@repo/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** 產生 [start, end] 之間所有月份的 YYYY-MM-DD 陣列（月初） */
export function generateMonthRange(start: string, end: string): string[] {
  const months: string[] = [];
  const sParts = start.split('-').map(Number);
  const eParts = end.split('-').map(Number);
  let y = sParts[0]!;
  let m = sParts[1]!;
  const ey = eParts[0]!;
  const em = eParts[1]!;
  while (y < ey || (y === ey && m <= em)) {
    months.push(`${y}-${String(m).padStart(2, '0')}-01`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return months;
}

// ---------------------------------------------------------------------------
// 虛擬信封 ID（跨邊界轉出未分類）
// ---------------------------------------------------------------------------

export const UNCLASSIFIED_OUT_ID = '__UNCLASSIFIED_OUT__';

// ---------------------------------------------------------------------------
// Core fold
// ---------------------------------------------------------------------------

export interface CategoryMeta {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

export interface ComputeMonthViewParams {
  startMonth: string;
  targetMonth: string;
  startRTA: number;
  /** key = 'YYYY-MM-DD', value = inflow amount */
  inflowByMonth: Record<string, number>;
  /** key = categoryId, nested key = 'YYYY-MM-DD' */
  assignedByCatMonth: Record<string, Record<string, number>>;
  /** key = categoryId, nested key = 'YYYY-MM-DD'. activity 已取負（支出 = 負值） */
  activityByCatMonth: Record<string, Record<string, number>>;
  /** 所有信封分類（含 UNCLASSIFIED_OUT 若有資料） */
  categories: CategoryMeta[];
}

export function computeMonthView(
  params: ComputeMonthViewParams,
): BudgetMonthView {
  const {
    startMonth,
    targetMonth,
    startRTA,
    inflowByMonth,
    assignedByCatMonth,
    activityByCatMonth,
    categories,
  } = params;

  const months = generateMonthRange(startMonth, targetMonth);
  const envelopeIds = categories.map((c) => c.id);

  // carry[catId] = 上月底 available
  const carry: Record<string, number> = {};
  for (const id of envelopeIds) carry[id] = 0;

  let cumAssigned = 0;
  let cumInflow = 0;
  let priorOverspend = 0;

  // 最後一個月的 available snapshot
  let finalAvailable: Record<string, number> = {};

  for (let mi = 0; mi < months.length; mi++) {
    const m = months[mi]!;
    const isLast = mi === months.length - 1;
    const monthAvail: Record<string, number> = {};

    let monthTotalAssigned = 0;

    for (const cid of envelopeIds) {
      const assigned = assignedByCatMonth[cid]?.[m] ?? 0;
      const activity = activityByCatMonth[cid]?.[m] ?? 0;
      const carryIn = Math.max(0, carry[cid] ?? 0);
      monthAvail[cid] = roundToBaseCurrency(carryIn + assigned + activity);
      monthTotalAssigned += assigned;
    }

    cumAssigned += monthTotalAssigned;
    cumInflow += inflowByMonth[m] ?? 0;

    if (!isLast) {
      // 非最後月：累積 cash overspending（負 available 歸零）
      for (const cid of envelopeIds) {
        const avail = monthAvail[cid] ?? 0;
        if (avail < 0) {
          priorOverspend += avail; // 負值累加
        }
        carry[cid] = avail;
      }
    }

    finalAvailable = monthAvail;
  }

  // RTA = startRTA + cumInflow − cumAssigned + priorOverspend
  const readyToAssign = roundToBaseCurrency(
    startRTA + cumInflow - cumAssigned + priorOverspend,
  );

  const rtaBreakdown: BudgetRTABreakdown = {
    startingBalance: roundToBaseCurrency(startRTA),
    cumulativeInflow: roundToBaseCurrency(cumInflow),
    cumulativeAssigned: roundToBaseCurrency(cumAssigned),
    priorOverspending: roundToBaseCurrency(priorOverspend),
  };

  // 組裝 rows
  const targetM = targetMonth.endsWith('-01')
    ? targetMonth
    : `${targetMonth}-01`;
  const rows: BudgetEnvelopeRow[] = [];
  let unclassifiedTransferOut: { activity: number; available: number } | null =
    null;

  let totalAssigned = 0;
  let totalActivity = 0;
  let totalAvailable = 0;

  for (const cat of categories) {
    const assigned = assignedByCatMonth[cat.id]?.[targetM] ?? 0;
    const activity = activityByCatMonth[cat.id]?.[targetM] ?? 0;
    const available = finalAvailable[cat.id] ?? 0;

    if (cat.id === UNCLASSIFIED_OUT_ID) {
      if (activity !== 0 || available !== 0) {
        unclassifiedTransferOut = { activity, available };
      }
      totalActivity += activity;
      totalAvailable += available;
      continue;
    }

    rows.push({
      categoryId: cat.id,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      assigned,
      activity,
      available,
      isOverspent: available < 0,
    });

    totalAssigned += assigned;
    totalActivity += activity;
    totalAvailable += available;
  }

  return {
    month: targetM,
    startMonth,
    readyToAssign,
    rtaBreakdown,
    rows,
    unclassifiedTransferOut,
    totals: {
      assigned: roundToBaseCurrency(totalAssigned),
      activity: roundToBaseCurrency(totalActivity),
      available: roundToBaseCurrency(totalAvailable),
    },
  };
}
