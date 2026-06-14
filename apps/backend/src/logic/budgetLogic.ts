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
  BudgetTargetInfo,
  CreditCardPaymentRow,
  OverspendKind,
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

/** 兩個月初字串相差幾個月（b − a），可負 */
export function monthDiff(a: string, b: string): number {
  const [ay, am] = a.split('-').map(Number);
  const [by, bm] = b.split('-').map(Number);
  return (by! - ay!) * 12 + (bm! - am!);
}

// ---------------------------------------------------------------------------
// 虛擬信封 ID（跨邊界轉出未分類）
// ---------------------------------------------------------------------------

export const UNCLASSIFIED_OUT_ID = '__UNCLASSIFIED_OUT__';

// ---------------------------------------------------------------------------
// Underfunded（Phase 2 ③ / P2-D10）——純推導，不落庫
// ---------------------------------------------------------------------------

/**
 * 依 target 與本月狀態推導「還需再分配多少才達標」。
 *  - SET_ASIDE：每月另存 amount → max(0, amount − assigned)
 *  - REFILL：補滿到 amount → max(0, amount − carryIn − assigned)
 *  - BALANCE_BY_DATE：到期月前湊到 amount → 缺口(amount − carryIn) ÷ 剩餘月數，再扣本月已 assigned
 * carryIn = max(0, 上月結轉)；assigned = 本月已分配。
 */
export function computeUnderfunded(
  target: BudgetTargetInfo,
  carryIn: number,
  assigned: number,
  targetMonth: string,
): number {
  switch (target.type) {
    case 'SET_ASIDE':
      return Math.max(0, roundToBaseCurrency(target.amount - assigned));
    case 'REFILL':
      return Math.max(
        0,
        roundToBaseCurrency(target.amount - carryIn - assigned),
      );
    case 'BALANCE_BY_DATE': {
      const gap = Math.max(0, target.amount - carryIn);
      const months = target.dueDate
        ? Math.max(1, monthDiff(targetMonth, target.dueDate) + 1)
        : 1;
      const monthlyNeed = roundToBaseCurrency(gap / months);
      return Math.max(0, roundToBaseCurrency(monthlyNeed - assigned));
    }
    default:
      return 0;
  }
}

// ---------------------------------------------------------------------------
// Core fold
// ---------------------------------------------------------------------------

export interface CategoryMeta {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

/** on-budget 信用卡（Phase 2 ④） */
export interface CardMeta {
  id: string;
  name: string;
}

/** 依現金/信用超支判定超支種類（Phase 2 ④） */
function overspendKindOf(cash: number, credit: number): OverspendKind {
  if (cash > 0 && credit > 0) return 'mixed';
  if (cash > 0) return 'cash';
  if (credit > 0) return 'credit';
  return null;
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
  /** key = categoryId 的 target（Phase 2 ③）；無則整體省略 */
  targetsByCat?: Record<string, BudgetTargetInfo>;

  // ----- Phase 2 ④ 信用卡完整機制（皆 optional，無卡時行為與前相同） -----
  /** on-budget 信用卡清單 */
  cards?: CardMeta[];
  /** 信用卡刷卡支出（正值）：[envelopeId][cardId][month] */
  cardSpendByEnvCardMonth?: Record<
    string,
    Record<string, Record<string, number>>
  >;
  /** 還款（銀行→卡，正值）：[cardId][month] */
  repayByCardMonth?: Record<string, Record<string, number>>;
  /** CC Payment 信封分配：[cardId][month] */
  ccAssignedByCardMonth?: Record<string, Record<string, number>>;
  /** 各卡起始 carry（= 起始日卡餘額，負值 = 起始卡債）：[cardId] */
  ccStartCarry?: Record<string, number>;
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
    targetsByCat = {},
    cards = [],
    cardSpendByEnvCardMonth = {},
    repayByCardMonth = {},
    ccAssignedByCardMonth = {},
    ccStartCarry = {},
  } = params;

  type CCState = {
    assigned: number;
    covered: number;
    payments: number;
    available: number;
    activity: number;
  };

  const months = generateMonthRange(startMonth, targetMonth);
  const envelopeIds = categories.map((c) => c.id);
  const cardIds = cards.map((c) => c.id);

  // carry[catId] = 上月底 available（讀取時 floor 至 0）
  const carry: Record<string, number> = {};
  for (const id of envelopeIds) carry[id] = 0;
  // carryCC[cardId] = 上月底 CC Payment available（不 floor，負 = 卡債延續）
  const carryCC: Record<string, number> = {};
  for (const id of cardIds) carryCC[id] = ccStartCarry[id] ?? 0;

  let cumAssigned = 0;
  let cumAssignedCC = 0;
  let cumInflow = 0;
  let priorOverspend = 0; // 僅累計 cash overspending（負值；credit overspend 不扣 RTA）

  // target 月快照
  let finalAvailable: Record<string, number> = {};
  let finalCC: Record<string, CCState> = {};
  const finalOverspendKind: Record<string, OverspendKind> = {};
  let finalCreditOverspend = 0;

  for (let mi = 0; mi < months.length; mi++) {
    const m = months[mi]!;
    const isLast = mi === months.length - 1;
    const monthAvail: Record<string, number> = {};
    const monthCashOverspend: Record<string, number> = {};
    const monthCreditOverspend: Record<string, number> = {};
    const coveredByCard: Record<string, number> = {};
    for (const id of cardIds) coveredByCard[id] = 0;

    let monthTotalAssigned = 0;

    for (const cid of envelopeIds) {
      const assigned = assignedByCatMonth[cid]?.[m] ?? 0;
      const activity = activityByCatMonth[cid]?.[m] ?? 0;
      const carryIn = Math.max(0, carry[cid] ?? 0);
      const availEnv = roundToBaseCurrency(carryIn + assigned + activity);
      monthAvail[cid] = availEnv;
      monthTotalAssigned += assigned;

      // 本信封本月各卡刷卡支出（正值）→ 算 covered / 現金 vs 信用超支切分
      let TC = 0;
      const cardSpendHere: Record<string, number> = {};
      for (const cardId of cardIds) {
        const cs = cardSpendByEnvCardMonth[cid]?.[cardId]?.[m] ?? 0;
        if (cs > 0) {
          cardSpendHere[cardId] = cs;
          TC += cs;
        }
      }
      const overspend = Math.max(0, -availEnv);
      const creditOverspend = Math.min(TC, overspend);
      const cashOverspend = roundToBaseCurrency(overspend - creditOverspend);
      monthCashOverspend[cid] = cashOverspend;
      monthCreditOverspend[cid] = roundToBaseCurrency(creditOverspend);

      // covered 總額 = TC − creditOverspend；以卡 id 順序貪婪分配未覆蓋額
      let remOver = creditOverspend;
      for (const cardId of cardIds) {
        const cs = cardSpendHere[cardId] ?? 0;
        if (cs <= 0) continue;
        const over = Math.min(remOver, cs);
        remOver = roundToBaseCurrency(remOver - over);
        coveredByCard[cardId] = roundToBaseCurrency(
          (coveredByCard[cardId] ?? 0) + (cs - over),
        );
      }
    }

    // 本月各卡 CC Payment：available = carry + assigned + covered − repay
    const monthCC: Record<string, CCState> = {};
    let monthCCAssigned = 0;
    for (const cardId of cardIds) {
      const a = ccAssignedByCardMonth[cardId]?.[m] ?? 0;
      const cov = coveredByCard[cardId] ?? 0;
      const pay = repayByCardMonth[cardId]?.[m] ?? 0;
      const available = roundToBaseCurrency(
        (carryCC[cardId] ?? 0) + a + cov - pay,
      );
      monthCC[cardId] = {
        assigned: a,
        covered: cov,
        payments: pay,
        available,
        activity: roundToBaseCurrency(cov - pay),
      };
      monthCCAssigned += a;
    }

    cumAssigned += monthTotalAssigned;
    cumAssignedCC += monthCCAssigned;
    cumInflow += inflowByMonth[m] ?? 0;

    if (!isLast) {
      // 非最後月：僅 cash overspend 扣下月 RTA；envelope 結轉、CC carry 延續（不 floor）
      for (const cid of envelopeIds) {
        priorOverspend = roundToBaseCurrency(
          priorOverspend - (monthCashOverspend[cid] ?? 0),
        );
        carry[cid] = monthAvail[cid] ?? 0;
      }
      for (const cardId of cardIds) {
        carryCC[cardId] = monthCC[cardId]!.available;
      }
    } else {
      finalCC = monthCC;
      for (const cid of envelopeIds) {
        finalOverspendKind[cid] = overspendKindOf(
          monthCashOverspend[cid] ?? 0,
          monthCreditOverspend[cid] ?? 0,
        );
        finalCreditOverspend = roundToBaseCurrency(
          finalCreditOverspend + (monthCreditOverspend[cid] ?? 0),
        );
      }
    }

    finalAvailable = monthAvail;
  }

  // RTA = startRTA + cumInflow − cumAssigned − cumAssignedCC + priorOverspend
  const readyToAssign = roundToBaseCurrency(
    startRTA + cumInflow - cumAssigned - cumAssignedCC + priorOverspend,
  );

  const rtaBreakdown: BudgetRTABreakdown = {
    startingBalance: roundToBaseCurrency(startRTA),
    cumulativeInflow: roundToBaseCurrency(cumInflow),
    cumulativeAssigned: roundToBaseCurrency(cumAssigned + cumAssignedCC),
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

    // carry[cat.id] 在月迴圈結束後保留「結轉進 target 月」的值（target 月不更新 carry）
    const carryIn = Math.max(0, carry[cat.id] ?? 0);
    const target = targetsByCat[cat.id] ?? null;
    const underfunded = target
      ? computeUnderfunded(target, carryIn, assigned, targetM)
      : 0;

    rows.push({
      categoryId: cat.id,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      assigned,
      activity,
      available,
      isOverspent: available < 0,
      target,
      underfunded,
      overspendKind: finalOverspendKind[cat.id] ?? null,
    });

    totalAssigned += assigned;
    totalActivity += activity;
    totalAvailable += available;
  }

  // CC Payment 信封列（Phase 2 ④）
  const creditCardPayments: CreditCardPaymentRow[] = cards.map((card) => {
    const cc = finalCC[card.id] ?? {
      assigned: 0,
      covered: 0,
      payments: 0,
      available: 0,
      activity: 0,
    };
    return {
      accountId: card.id,
      name: card.name,
      assigned: roundToBaseCurrency(cc.assigned),
      activity: roundToBaseCurrency(cc.activity),
      available: roundToBaseCurrency(cc.available),
      covered: roundToBaseCurrency(cc.covered),
      payments: roundToBaseCurrency(cc.payments),
      isDebt: cc.available < 0,
    };
  });

  return {
    month: targetM,
    startMonth,
    readyToAssign,
    rtaBreakdown,
    rows,
    unclassifiedTransferOut,
    creditCardPayments,
    creditOverspending: roundToBaseCurrency(finalCreditOverspend),
    totals: {
      assigned: roundToBaseCurrency(totalAssigned),
      activity: roundToBaseCurrency(totalActivity),
      available: roundToBaseCurrency(totalAvailable),
    },
  };
}
