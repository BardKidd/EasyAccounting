/**
 * budgetLogic 純函式測試 — 零 DB 依賴。
 *
 * 涵蓋 spec §5.1 恆等式：
 * 1. startRTA + Σ流入 = RTA + Σ Available(歸零前) + |已沖銷 cash overspending|
 * 2. Available(c,m) = max(0, Available(c,m−1)) + Assigned(c,m) + Activity(c,m)
 * 3. 上月 cash overspending = 本月 RTA 扣減量
 */

import { describe, it, expect } from 'vitest';
import { computeMonthView, generateMonthRange, UNCLASSIFIED_OUT_ID } from '@/logic/budgetLogic';
import type { CategoryMeta } from '@/logic/budgetLogic';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const cat = (id: string, name: string): CategoryMeta => ({
  id,
  name,
  icon: null,
  color: null,
});

const cats = [cat('food', '飲食'), cat('transport', '交通'), cat('entertainment', '娛樂')];

// ---------------------------------------------------------------------------
// generateMonthRange
// ---------------------------------------------------------------------------

describe('generateMonthRange', () => {
  it('generates correct range', () => {
    expect(generateMonthRange('2026-01-01', '2026-03-01')).toEqual([
      '2026-01-01',
      '2026-02-01',
      '2026-03-01',
    ]);
  });

  it('single month', () => {
    expect(generateMonthRange('2026-06-01', '2026-06-01')).toEqual([
      '2026-06-01',
    ]);
  });

  it('cross year boundary', () => {
    expect(generateMonthRange('2025-11-01', '2026-02-01')).toEqual([
      '2025-11-01',
      '2025-12-01',
      '2026-01-01',
      '2026-02-01',
    ]);
  });
});

// ---------------------------------------------------------------------------
// computeMonthView
// ---------------------------------------------------------------------------

describe('computeMonthView', () => {
  it('basic single month — assigned and activity', () => {
    const result = computeMonthView({
      startMonth: '2026-01-01',
      targetMonth: '2026-01-01',
      startRTA: 10000,
      inflowByMonth: { '2026-01-01': 5000 },
      assignedByCatMonth: {
        food: { '2026-01-01': 3000 },
        transport: { '2026-01-01': 2000 },
      },
      activityByCatMonth: {
        food: { '2026-01-01': -1500 },
        transport: { '2026-01-01': -800 },
      },
      categories: cats,
    });

    expect(result.readyToAssign).toBe(10000 + 5000 - 5000); // 10000
    expect(result.rows.find((r: any) => r.categoryId === 'food')!.available).toBe(1500); // 3000 - 1500
    expect(result.rows.find((r: any) => r.categoryId === 'transport')!.available).toBe(1200); // 2000 - 800
    expect(result.rows.find((r: any) => r.categoryId === 'entertainment')!.available).toBe(0);
  });

  // 註：舊「恆等式 1」測試是套套邏輯——兩側都由 rtaBreakdown 同一組累計器導出，
  // cumAssigned/priorOverspending 精確相消，fold 任何 bug 都不會 fail（review M8）。
  // 改為「獨立加總 rows[].available」對「RTA + 輸入」的守恆檢驗，真正 exercise fold。

  it('恆等式 1（守恆，單月）：startRTA + 流入 + ΣActivity = RTA + Σ Available（rows 獨立加總，含負值）', () => {
    const result = computeMonthView({
      startMonth: '2026-01-01',
      targetMonth: '2026-01-01',
      startRTA: 10000,
      inflowByMonth: { '2026-01-01': 5000 },
      assignedByCatMonth: {
        food: { '2026-01-01': 8000 },
        transport: { '2026-01-01': 2000 },
      },
      activityByCatMonth: {
        food: { '2026-01-01': -9000 }, // 超支 1000 → available 為負
        transport: { '2026-01-01': -500 },
      },
      categories: cats,
    });

    // available 獨立取自 rows（非 rtaBreakdown 累計器）
    const sumAvailable =
      result.rows.reduce((s, r) => s + r.available, 0) +
      (result.unclassifiedTransferOut?.available ?? 0);
    const sumActivity = -9000 - 500;
    // 守恆：左 = 輸入 + ΣActivity；右 = RTA + Σrows.available。fold 算錯 available 即 fail。
    expect(10000 + 5000 + sumActivity).toBeCloseTo(
      result.readyToAssign + sumAvailable,
      5,
    );
    // 確實踩到負 available 路徑
    expect(result.rows.find((r: any) => r.categoryId === 'food')!.available).toBe(-1000);
    expect(sumAvailable).toBe(500); // −1000 + 1500 + 0
    expect(result.readyToAssign).toBe(5000); // 10000 + 5000 − 10000
  });

  it('恆等式 1（守恆，多月含跨月歸零）：money-in = 已花費 + 信封結餘 + RTA', () => {
    const result = computeMonthView({
      startMonth: '2026-01-01',
      targetMonth: '2026-03-01',
      startRTA: 10000,
      inflowByMonth: {
        '2026-01-01': 5000,
        '2026-02-01': 5000,
        '2026-03-01': 5000,
      },
      assignedByCatMonth: {
        food: { '2026-01-01': 8000, '2026-02-01': 3000, '2026-03-01': 2000 },
        transport: { '2026-01-01': 2000, '2026-02-01': 2000, '2026-03-01': 1000 },
      },
      activityByCatMonth: {
        // food 1 月超支（−9000 vs assigned 8000）→ 跨月歸零 + 扣 RTA
        food: { '2026-01-01': -9000, '2026-02-01': -2000, '2026-03-01': -1000 },
        transport: { '2026-01-01': -1000, '2026-02-01': -500, '2026-03-01': -500 },
      },
      categories: cats,
    });

    // 會計分割（全為支出，故 spent = |ΣActivity|）：進來的錢 = 已花費 + 信封結餘 + 未分配
    const moneyIn = 10000 + 15000; // startRTA + cumInflow = 25000
    const spent = 9000 + 2000 + 1000 + 1000 + 500 + 500; // 14000
    const inEnvelopes = result.rows.reduce(
      (s, r) => s + Math.max(0, r.available), // 結餘只算正的信封（負的已含在 spent）
      0,
    );
    expect(moneyIn).toBeCloseTo(spent + inEnvelopes + result.readyToAssign, 5);

    // 同時釘住關鍵推導值，防止分割式因抵銷而失去鑑別力
    expect(inEnvelopes).toBe(5000); // food 2000 + transport 3000
    expect(result.rtaBreakdown.priorOverspending).toBe(-1000); // 1 月 food 超支 1000
    expect(result.readyToAssign).toBe(6000); // 25000 − 18000(cumAssigned) − 1000
  });

  it('恆等式 2: Available 跨月遞迴推導', () => {
    // Month 1: food assigned 3000, activity -5000 → available = -2000 (overspent)
    // Month 2: carry = max(0, -2000) = 0, food assigned 1000, activity 0 → available = 1000
    const result = computeMonthView({
      startMonth: '2026-01-01',
      targetMonth: '2026-02-01',
      startRTA: 10000,
      inflowByMonth: {},
      assignedByCatMonth: {
        food: { '2026-01-01': 3000, '2026-02-01': 1000 },
      },
      activityByCatMonth: {
        food: { '2026-01-01': -5000 },
      },
      categories: [cat('food', '飲食')],
    });

    const foodRow = result.rows.find((r: any) => r.categoryId === 'food')!;
    // carry in = max(0, -2000) = 0; available = 0 + 1000 + 0 = 1000
    expect(foodRow.available).toBe(1000);
  });

  it('恆等式 3: cash overspending 扣 RTA', () => {
    // Month 1: food assigned 1000, activity -3000 → available = -2000
    // Month 2: RTA should be reduced by 2000
    const result = computeMonthView({
      startMonth: '2026-01-01',
      targetMonth: '2026-02-01',
      startRTA: 10000,
      inflowByMonth: {},
      assignedByCatMonth: {
        food: { '2026-01-01': 1000 },
      },
      activityByCatMonth: {
        food: { '2026-01-01': -3000 },
      },
      categories: [cat('food', '飲食')],
    });

    expect(result.rtaBreakdown.priorOverspending).toBe(-2000);
    // RTA = 10000 + 0 - 1000 + (-2000) = 7000
    expect(result.readyToAssign).toBe(7000);
  });

  it('negative assigned (搬錢修正)', () => {
    const result = computeMonthView({
      startMonth: '2026-01-01',
      targetMonth: '2026-01-01',
      startRTA: 10000,
      inflowByMonth: {},
      assignedByCatMonth: {
        food: { '2026-01-01': -500 },
      },
      activityByCatMonth: {},
      categories: [cat('food', '飲食')],
    });

    expect(result.rows[0]!.available).toBe(-500);
    expect(result.rows[0]!.isOverspent).toBe(true);
    // RTA = 10000 - (-500) = 10500
    expect(result.readyToAssign).toBe(10500);
  });

  it('unclassified transfer out 虛擬列', () => {
    const catsWithUnclassified = [
      ...cats,
      cat(UNCLASSIFIED_OUT_ID, '轉出（未分類）'),
    ];

    const result = computeMonthView({
      startMonth: '2026-01-01',
      targetMonth: '2026-01-01',
      startRTA: 10000,
      inflowByMonth: {},
      assignedByCatMonth: {},
      activityByCatMonth: {
        [UNCLASSIFIED_OUT_ID]: { '2026-01-01': -1000 },
      },
      categories: catsWithUnclassified,
    });

    expect(result.unclassifiedTransferOut).toEqual({
      activity: -1000,
      available: -1000,
    });
    // Should not appear in rows
    expect(result.rows.find((r: any) => r.categoryId === UNCLASSIFIED_OUT_ID)).toBeUndefined();
  });

  it('empty months (no activity, no assigned)', () => {
    const result = computeMonthView({
      startMonth: '2026-01-01',
      targetMonth: '2026-03-01',
      startRTA: 5000,
      inflowByMonth: {},
      assignedByCatMonth: {},
      activityByCatMonth: {},
      categories: [cat('food', '飲食')],
    });

    expect(result.readyToAssign).toBe(5000);
    expect(result.rows[0]!.available).toBe(0);
    expect(result.rtaBreakdown.priorOverspending).toBe(0);
  });

  it('UNCLASSIFIED 虛擬信封的負 available 也計入 cash overspending 扣下月 RTA', () => {
    // Month 1: 跨邊界轉出 1000（虛擬信封無 assigned）→ available = -1000
    // Month 2: RTA 扣 1000；虛擬列 carry 歸零且無新活動 → 回應中為 null
    const result = computeMonthView({
      startMonth: '2026-01-01',
      targetMonth: '2026-02-01',
      startRTA: 10000,
      inflowByMonth: {},
      assignedByCatMonth: {},
      activityByCatMonth: {
        [UNCLASSIFIED_OUT_ID]: { '2026-01-01': -1000 },
      },
      categories: [cat('food', '飲食'), cat(UNCLASSIFIED_OUT_ID, '轉出（未分類）')],
    });

    expect(result.rtaBreakdown.priorOverspending).toBe(-1000);
    expect(result.readyToAssign).toBe(9000);
    expect(result.unclassifiedTransferOut).toBeNull();
  });

  it('multi-month carry forward (正結轉)', () => {
    // Month 1: food assigned 5000, activity -2000 → available = 3000
    // Month 2: carry = 3000, assigned 0, activity -1000 → available = 2000
    // Month 3: carry = 2000, assigned 0, activity 0 → available = 2000
    const result = computeMonthView({
      startMonth: '2026-01-01',
      targetMonth: '2026-03-01',
      startRTA: 10000,
      inflowByMonth: {},
      assignedByCatMonth: {
        food: { '2026-01-01': 5000 },
      },
      activityByCatMonth: {
        food: { '2026-01-01': -2000, '2026-02-01': -1000 },
      },
      categories: [cat('food', '飲食')],
    });

    expect(result.rows[0]!.available).toBe(2000);
    expect(result.readyToAssign).toBe(10000 - 5000); // 5000
  });
});
