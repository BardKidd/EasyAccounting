export enum BudgetCycleType {
  YEAR = 'YEAR',
  MONTH = 'MONTH',
  WEEK = 'WEEK',
  DAY = 'DAY',
}

export interface Budget {
  id: string;
  userId: string;
  name: string;
  description?: string;
  amount: number;
  cycleType: BudgetCycleType;
  cycleStartDay: number; // 1-31 for Month, 1-7 for Week
  startDate: string; // ISO Date string
  endDate?: string; // ISO Date string
  isRecurring: boolean;
  rollover: boolean;
  isActive: boolean;
  currencyId?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  pendingAmount?: number;
  alert80SentAt?: string;
  alert100SentAt?: string;
  isRecalculating?: boolean;
  lastRecalculatedAt?: string;
}

export interface BudgetCategory {
  id: string;
  budgetId: string;
  categoryId: string;
  amount: number;
  isExcluded: boolean;
  createdAt: string;
  updatedAt: string;
  usage?: {
    spent: number;
    percentage: number;
  };
}

export interface BudgetPeriodSnapshot {
  id: string;
  budgetId: string;
  periodStart: string;
  periodEnd: string;
  budgetAmount: number;
  spentAmount: number;
  rolloverIn: number;
  rolloverOut: number;
  createdAt: string;
  lastRecalculatedAt?: string;
}

export interface BudgetUsage {
  spent: number;
  available: number;
  remaining: number;
  usageRate: number;
}

export interface CreateBudgetRequest {
  name: string;
  description?: string;
  amount: number;
  cycleType: BudgetCycleType;
  cycleStartDay: number;
  startDate: string;
  endDate?: string;
  isRecurring: boolean;
  rollover: boolean;
  categoryIds?: string[]; // IDs of categories to associate
}

export interface UpdateBudgetRequest {
  name?: string;
  description?: string;
  amount?: number;
  cycleType?: BudgetCycleType;
  cycleStartDay?: number;
  endDate?: string;
  isActive?: boolean;
  rollover?: boolean;
  effectiveFrom?: 'immediate' | 'nextPeriod';
}

export interface BudgetDetail extends Budget {
  budgetCategories: BudgetCategory[];
  usage: BudgetUsage;
  snapshots: BudgetPeriodSnapshot[];
}
