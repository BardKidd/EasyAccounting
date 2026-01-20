import {
  Budget,
  BudgetCycleType,
  BudgetDetail,
  BudgetUsage,
  CreateBudgetRequest,
  UpdateBudgetRequest,
} from '@/types/budget';
import { ResponseHelper } from '@repo/shared';

// Simulated delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Mock Data Store
let MOCK_BUDGETS: Budget[] = [
  {
    id: 1,
    userId: 1,
    name: '月薪日常預算',
    description: '包含餐飲、交通、日常用品',
    amount: 20000,
    cycleType: BudgetCycleType.MONTH,
    cycleStartDay: 1,
    startDate: '2025-01-01',
    isRecurring: true,
    rollover: true,
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 2,
    userId: 1,
    name: '年度旅遊基金',
    description: '存錢去日本',
    amount: 100000,
    cycleType: BudgetCycleType.YEAR,
    cycleStartDay: 1,
    startDate: '2025-01-01',
    isRecurring: true,
    rollover: true,
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 3,
    userId: 1,
    name: '每週零食費',
    amount: 500,
    cycleType: BudgetCycleType.WEEK,
    cycleStartDay: 1, // Monday
    startDate: '2025-01-01',
    isRecurring: true,
    rollover: false,
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
];

const MOCK_USAGE: Record<number, BudgetUsage> = {
  1: {
    spent: 12500,
    available: 20000,
    remaining: 7500,
    usageRate: 62.5,
  },
  2: {
    spent: 20000,
    available: 100000,
    remaining: 80000,
    usageRate: 20.0,
  },
  3: {
    spent: 450,
    available: 500,
    remaining: 50,
    usageRate: 90.0,
  },
};

export const budgetService = {
  getBudgets: async (): Promise<ResponseHelper<Budget[]>> => {
    await delay(500);
    return {
      isSuccess: true,
      message: 'Success',
      data: [...MOCK_BUDGETS],
      error: null,
    };
  },

  getBudgetById: async (id: number): Promise<ResponseHelper<BudgetDetail>> => {
    await delay(500);
    const budget = MOCK_BUDGETS.find((b) => b.id === id);
    if (!budget) {
      return {
        isSuccess: false,
        message: 'Budget not found',
        data: null as any,
        error: [{ message: 'Budget not found', path: 'id' }],
      };
    }

    // Mock categories
    const mockCategories = [
      {
        id: 101,
        budgetId: id,
        categoryId: 1,
        amount: 5000,
        isExcluded: false,
        createdAt: '',
        updatedAt: '',
        category: {
          id: 1,
          name: '餐飲',
          icon: 'utensils',
          color: '#ff0000',
          type: 'EXPENSE',
        },
      },
      {
        id: 102,
        budgetId: id,
        categoryId: 2,
        amount: 3000,
        isExcluded: false,
        createdAt: '',
        updatedAt: '',
        category: {
          id: 2,
          name: '交通',
          icon: 'car',
          color: '#00ff00',
          type: 'EXPENSE',
        },
      },
    ] as any[];

    return {
      isSuccess: true,
      message: 'Success',
      data: {
        ...budget,
        categories: mockCategories,
        usage: MOCK_USAGE[id] || {
          spent: 0,
          available: budget.amount,
          remaining: budget.amount,
          usageRate: 0,
        },
        snapshots: [], // Mock snapshots if needed
      },
      error: null,
    };
  },

  createBudget: async (
    data: CreateBudgetRequest,
  ): Promise<ResponseHelper<Budget>> => {
    await delay(800);
    const newBudget: Budget = {
      id: Math.max(...MOCK_BUDGETS.map((b) => b.id), 0) + 1,
      userId: 1,
      name: data.name,
      description: data.description,
      amount: data.amount,
      cycleType: data.cycleType,
      cycleStartDay: data.cycleStartDay,
      startDate: data.startDate,
      endDate: data.endDate,
      isRecurring: data.isRecurring,
      rollover: data.rollover,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    MOCK_BUDGETS.push(newBudget);
    MOCK_USAGE[newBudget.id] = {
      spent: 0,
      available: newBudget.amount,
      remaining: newBudget.amount,
      usageRate: 0,
    };
    return {
      isSuccess: true,
      message: 'Budget created successfully',
      data: newBudget,
      error: null,
    };
  },

  updateBudget: async (
    id: number,
    data: UpdateBudgetRequest,
  ): Promise<ResponseHelper<Budget>> => {
    await delay(800);
    const index = MOCK_BUDGETS.findIndex((b) => b.id === id);
    if (index === -1) {
      return {
        isSuccess: false,
        message: 'Budget not found',
        data: null as any,
        error: [{ message: 'Budget not found', path: 'id' }],
      };
    }

    const updatedBudget = {
      ...MOCK_BUDGETS[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };

    // Simulate pending amount if effectiveFrom is nextPeriod
    if (data.effectiveFrom === 'nextPeriod' && data.amount !== undefined) {
      updatedBudget.pendingAmount = data.amount;
      // Revert amount change for immediate response (it will be applied later)
      updatedBudget.amount = MOCK_BUDGETS[index].amount;
    } else if (data.amount !== undefined) {
      // Immediate update
      updatedBudget.amount = data.amount;
      updatedBudget.pendingAmount = undefined;
    }

    MOCK_BUDGETS[index] = updatedBudget as Budget;

    return {
      isSuccess: true,
      message: 'Budget updated successfully',
      data: updatedBudget as Budget,
      error: null,
    };
  },

  deleteBudget: async (id: number): Promise<ResponseHelper<void>> => {
    await delay(500);
    MOCK_BUDGETS = MOCK_BUDGETS.filter((b) => b.id !== id);
    return {
      isSuccess: true,
      message: 'Budget deleted successfully',
      data: undefined,
      error: null,
    };
  },

  recalculateBudget: async (id: number): Promise<ResponseHelper<void>> => {
    await delay(2000); // Simulate long calculation
    // Mark as recalculating? The UI handles this state usually.
    return {
      isSuccess: true,
      message: 'Budget recalculation started',
      data: undefined,
      error: null,
    };
  },

  addBudgetCategory: async (
    budgetId: number,
    categoryId: number,
    amount: number,
  ): Promise<ResponseHelper<any>> => {
    await delay(500);
    return {
      isSuccess: true,
      message: 'Category added to budget',
      data: {
        id: Math.random(),
        budgetId,
        categoryId,
        amount,
        isExcluded: false,
      },
      error: null,
    };
  },

  removeBudgetCategory: async (
    budgetId: number,
    categoryId: number,
  ): Promise<ResponseHelper<void>> => {
    await delay(500);
    return {
      isSuccess: true,
      message: 'Category removed from budget',
      data: undefined,
      error: null,
    };
  },
};
