import { describe, it, expect } from 'vitest';
import { getCurrentPeriod, getPreviousPeriod } from '@/services/budgetService';
import { BudgetCycleType } from '@/models/budget';

// Helper to create local date without timezone issues
function localDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day); // month is 0-indexed in JS
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

describe('Budget Service - Period Calculation', () => {
  describe('getCurrentPeriod - DAY', () => {
    it('should return same day for DAY cycle', () => {
      const budget = {
        cycleType: BudgetCycleType.DAY,
        cycleStartDay: 1,
        startDate: '2026-01-01',
      };
      const ref = localDate(2026, 1, 15);
      const period = getCurrentPeriod(budget, ref);

      expect(formatDate(period.start)).toBe('2026-01-15');
      expect(formatDate(period.end)).toBe('2026-01-15');
    });
  });

  describe('getCurrentPeriod - WEEK', () => {
    it('should calculate week period starting from Monday (cycleStartDay=1)', () => {
      const budget = {
        cycleType: BudgetCycleType.WEEK,
        cycleStartDay: 1, // Monday
        startDate: '2026-01-01',
      };
      // 2026-01-20 is Tuesday
      const ref = localDate(2026, 1, 20);
      const period = getCurrentPeriod(budget, ref);

      // Week should start from Monday 2026-01-19
      expect(formatDate(period.start)).toBe('2026-01-19');
      // Week should end on Sunday 2026-01-25
      expect(formatDate(period.end)).toBe('2026-01-25');
    });

    it('should calculate week period starting from Sunday (cycleStartDay=7)', () => {
      const budget = {
        cycleType: BudgetCycleType.WEEK,
        cycleStartDay: 7, // Sunday
        startDate: '2026-01-01',
      };
      // 2026-01-20 is Tuesday
      const ref = localDate(2026, 1, 20);
      const period = getCurrentPeriod(budget, ref);

      // Week should start from Sunday 2026-01-18
      expect(formatDate(period.start)).toBe('2026-01-18');
      // Week should end on Saturday 2026-01-24
      expect(formatDate(period.end)).toBe('2026-01-24');
    });
  });

  describe('getCurrentPeriod - MONTH', () => {
    it('should calculate month period starting from 1st', () => {
      const budget = {
        cycleType: BudgetCycleType.MONTH,
        cycleStartDay: 1,
        startDate: '2026-01-01',
      };
      const ref = localDate(2026, 1, 15);
      const period = getCurrentPeriod(budget, ref);

      expect(formatDate(period.start)).toBe('2026-01-01');
      expect(formatDate(period.end)).toBe('2026-01-31');
    });

    it('should calculate month period starting from 15th', () => {
      const budget = {
        cycleType: BudgetCycleType.MONTH,
        cycleStartDay: 15,
        startDate: '2026-01-01',
      };
      const ref = localDate(2026, 1, 20);
      const period = getCurrentPeriod(budget, ref);

      expect(formatDate(period.start)).toBe('2026-01-15');
      expect(formatDate(period.end)).toBe('2026-02-14');
    });

    it('should handle cycleStartDay=31 in February', () => {
      const budget = {
        cycleType: BudgetCycleType.MONTH,
        cycleStartDay: 31,
        startDate: '2026-01-01',
      };
      const ref = localDate(2026, 2, 15);
      const period = getCurrentPeriod(budget, ref);

      // February only has 28 days, so should use 28th
      expect(formatDate(period.start)).toBe('2026-01-31');
      expect(formatDate(period.end)).toBe('2026-02-27');
    });
  });

  describe('getCurrentPeriod - YEAR', () => {
    it('should return year period based on startDate month/day (1/1 start)', () => {
      const budget = {
        cycleType: BudgetCycleType.YEAR,
        cycleStartDay: 1,
        startDate: '2026-01-01',
      };
      const ref = localDate(2026, 6, 15);
      const period = getCurrentPeriod(budget, ref);

      expect(formatDate(period.start)).toBe('2026-01-01');
      expect(formatDate(period.end)).toBe('2026-12-31');
    });

    it('should return year period based on startDate month/day (4/1 start)', () => {
      const budget = {
        cycleType: BudgetCycleType.YEAR,
        cycleStartDay: 1,
        startDate: '2026-04-01',
      };
      // ref is June 15, 2026 - after April 1
      const ref = localDate(2026, 6, 15);
      const period = getCurrentPeriod(budget, ref);

      expect(formatDate(period.start)).toBe('2026-04-01');
      expect(formatDate(period.end)).toBe('2027-03-31');
    });

    it('should handle ref before yearly start date', () => {
      const budget = {
        cycleType: BudgetCycleType.YEAR,
        cycleStartDay: 1,
        startDate: '2026-04-01',
      };
      // ref is Feb 15, 2026 - before April 1, so belongs to previous year's cycle
      const ref = localDate(2026, 2, 15);
      const period = getCurrentPeriod(budget, ref);

      expect(formatDate(period.start)).toBe('2025-04-01');
      expect(formatDate(period.end)).toBe('2026-03-31');
    });
  });

  describe('getPreviousPeriod', () => {
    it('should get previous month period', () => {
      const budget = {
        cycleType: BudgetCycleType.MONTH,
        cycleStartDay: 1,
        startDate: '2026-01-01',
      };
      const currentPeriodStart = localDate(2026, 2, 1);
      const prevPeriod = getPreviousPeriod(budget, currentPeriodStart);

      expect(formatDate(prevPeriod.start)).toBe('2026-01-01');
      expect(formatDate(prevPeriod.end)).toBe('2026-01-31');
    });
  });
});
