import {
  Budget,
  BudgetCategory,
  BudgetPeriodSnapshot,
  Transaction,
  TransactionBudget,
  Category,
} from '@/models';
import {
  BudgetCycleType,
  BudgetAttributes,
  BudgetInstance,
} from '@/models/budget';
import { RootType } from '@repo/shared';
import { Op } from 'sequelize';

// -----------------------------------------------------------------------------
// Error Codes
// -----------------------------------------------------------------------------

export enum BudgetError {
  BUDGET_NOT_FOUND = 'BUDGET_NOT_FOUND',
  BUDGET_CATEGORY_NOT_FOUND = 'BUDGET_CATEGORY_NOT_FOUND',
  NOT_MAIN_CATEGORY = 'NOT_MAIN_CATEGORY',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
}

// -----------------------------------------------------------------------------
// Period Calculation
// -----------------------------------------------------------------------------

interface Period {
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
      throw new Error(`Unknown cycleType: ${budget.cycleType}`);
  }
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

// -----------------------------------------------------------------------------
// Usage Calculation
// -----------------------------------------------------------------------------

export interface UsageInfo {
  spent: number;
  available: number;
  remaining: number;
  usageRate: number;
}

/**
 * 計算預算使用率
 * 基於 TransactionBudget 關聯
 */
export async function calculateUsage(
  budgetId: string,
  userId: string,
  period: Period,
): Promise<UsageInfo> {
  const budget = await Budget.findByPk(budgetId);
  if (!budget) {
    throw new Error('Budget not found');
  }

  // 透過 TransactionBudget 取得歸屬於此預算的交易
  const transactions = await Transaction.findAll({
    where: {
      userId,
      type: RootType.EXPENSE,
      date: {
        [Op.gte]: period.start.toISOString().split('T')[0],
        [Op.lte]: period.end.toISOString().split('T')[0],
      },
    },
    include: [
      {
        model: TransactionBudget,
        as: 'transactionBudgets',
        where: { budgetId },
        required: true,
      },
    ],
  });

  // 計算已花費
  const spent = transactions.reduce((sum, tx) => {
    const amount = Number(tx.amount);
    return sum + Math.abs(amount);
  }, 0);

  // 取得 rollover
  const rolloverIn = await getRolloverIn(budgetId, period);

  // 計算可用額度
  const available = Number(budget.amount) + rolloverIn;

  // 計算使用率（小數第二位）
  const usageRate =
    available > 0 ? Math.round((spent / available) * 10000) / 100 : 0;

  return {
    spent,
    available,
    remaining: available - spent,
    usageRate,
  };
}

/**
 * 取得從上期結轉進來的金額
 */
async function getRolloverIn(
  budgetId: string,
  period: Period,
): Promise<number> {
  const budget = (await Budget.findByPk(budgetId)) as BudgetInstance | null;
  if (!budget || !budget.rollover || !budget.isRecurring) {
    return 0;
  }

  const prevPeriod = getPreviousPeriod(
    budget as BudgetAttributes,
    period.start,
  );

  // 查找上期 Snapshot
  const snapshot = await BudgetPeriodSnapshot.findOne({
    where: {
      budgetId,
      periodEnd: prevPeriod.end.toISOString().split('T')[0],
    },
  });

  if (snapshot) {
    return Number(snapshot.rolloverOut);
  }

  return 0;
}

// -----------------------------------------------------------------------------
// CRUD Operations
// -----------------------------------------------------------------------------

export interface CreateBudgetInput {
  name: string;
  description?: string;
  amount: number;
  cycleType: BudgetCycleType;
  cycleStartDay: number;
  startDate: string;
  endDate?: string;
  isRecurring?: boolean;
  rollover?: boolean;
}

export async function createBudget(
  userId: string,
  input: CreateBudgetInput,
): Promise<BudgetInstance> {
  return Budget.create({
    userId,
    name: input.name,
    description: input.description,
    amount: input.amount,
    cycleType: input.cycleType,
    cycleStartDay: input.cycleStartDay,
    startDate: input.startDate,
    endDate: input.endDate,
    isRecurring: input.isRecurring ?? false,
    rollover: input.rollover ?? false,
  });
}

export interface UpdateBudgetInput {
  name?: string;
  description?: string;
  amount?: number;
  cycleType?: BudgetCycleType;
  cycleStartDay?: number;
  startDate?: string;
  endDate?: string;
  isRecurring?: boolean;
  rollover?: boolean;
  isActive?: boolean;
}

export type EffectiveFrom = 'immediate' | 'nextPeriod';

export async function updateBudget(
  budgetId: string,
  userId: string,
  input: UpdateBudgetInput,
  effectiveFrom: EffectiveFrom = 'nextPeriod',
): Promise<BudgetInstance | null> {
  const budget = await Budget.findOne({
    where: { id: budgetId, userId },
  });

  if (!budget) {
    return null;
  }

  // 如果修改金額且選擇「下期生效」
  if (input.amount !== undefined && effectiveFrom === 'nextPeriod') {
    await budget.update({
      ...input,
      amount: budget.amount, // 保持原額度
      pendingAmount: input.amount, // 記錄待生效額度
    });
  } else {
    await budget.update(input);
  }

  return budget;
}

export async function deleteBudget(
  budgetId: string,
  userId: string,
): Promise<boolean> {
  const budget = await Budget.findOne({
    where: { id: budgetId, userId },
  });

  if (!budget) {
    return false;
  }

  await budget.destroy(); // soft delete
  return true;
}

export async function getBudgetById(
  budgetId: string,
  userId: string,
): Promise<BudgetInstance | null> {
  return Budget.findOne({
    where: { id: budgetId, userId },
    include: [
      {
        model: BudgetCategory,
        as: 'budgetCategories',
        include: [
          {
            model: Category,
            as: 'category',
          },
        ],
      },
    ],
  });
}

export async function getAllBudgets(userId: string): Promise<BudgetInstance[]> {
  return Budget.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
  });
}

/**
 * 取得預算詳情，包含當前週期使用率
 */
export async function getBudgetWithUsage(budgetId: string, userId: string) {
  const budget = await getBudgetById(budgetId, userId);
  if (!budget) {
    return null;
  }

  const currentPeriod = getCurrentPeriod(
    budget as BudgetAttributes,
    new Date(),
  );
  const usage = await calculateUsage(budgetId, userId, currentPeriod);

  // 惰性建立上期 Snapshot（如果需要）
  await ensurePreviousSnapshot(budget, currentPeriod);

  return {
    ...budget.toJSON(),
    currentPeriod: {
      start: currentPeriod.start.toISOString().split('T')[0],
      end: currentPeriod.end.toISOString().split('T')[0],
    },
    usage,
  };
}

/**
 * 取得所有預算，包含使用率
 */
export async function getAllBudgetsWithUsage(userId: string) {
  const budgets = await getAllBudgets(userId);

  const results = await Promise.all(
    budgets.map(async (budget) => {
      const currentPeriod = getCurrentPeriod(
        budget as BudgetAttributes,
        new Date(),
      );
      const usage = await calculateUsage(budget.id, userId, currentPeriod);

      return {
        ...budget.toJSON(),
        currentPeriod: {
          start: currentPeriod.start.toISOString().split('T')[0],
          end: currentPeriod.end.toISOString().split('T')[0],
        },
        usage,
      };
    }),
  );

  return results;
}

// -----------------------------------------------------------------------------
// Snapshot Lazy Evaluation
// -----------------------------------------------------------------------------

/**
 * 確保上期 Snapshot 存在（惰性建立）
 */
async function ensurePreviousSnapshot(
  budget: BudgetInstance,
  currentPeriod: Period,
): Promise<void> {
  if (!budget.isRecurring) {
    return;
  }

  const prevPeriod = getPreviousPeriod(
    budget as BudgetAttributes,
    currentPeriod.start,
  );
  const now = new Date();

  // 只有上期已結束才需要建立
  if (prevPeriod.end >= now) {
    return;
  }

  const existingSnapshot = await BudgetPeriodSnapshot.findOne({
    where: {
      budgetId: budget.id,
      periodEnd: prevPeriod.end.toISOString().split('T')[0],
    },
  });

  if (!existingSnapshot) {
    await createSnapshot(budget, prevPeriod);
  }
}

/**
 * 建立週期 Snapshot
 */
async function createSnapshot(
  budget: BudgetInstance,
  period: Period,
): Promise<void> {
  const userId = budget.userId;

  // 計算該週期的花費
  const transactions = await Transaction.findAll({
    where: {
      userId,
      type: RootType.EXPENSE,
      date: {
        [Op.gte]: period.start.toISOString().split('T')[0],
        [Op.lte]: period.end.toISOString().split('T')[0],
      },
    },
    include: [
      {
        model: TransactionBudget,
        as: 'transactionBudgets',
        where: { budgetId: budget.id },
        required: true,
      },
    ],
  });

  const spentAmount = transactions.reduce((sum, tx) => {
    const amount = Number(tx.amount);
    return sum + Math.abs(amount);
  }, 0);

  // 取得上上期的 rolloverOut
  const prevPrevPeriod = getPreviousPeriod(
    budget as BudgetAttributes,
    period.start,
  );
  const prevSnapshot = await BudgetPeriodSnapshot.findOne({
    where: {
      budgetId: budget.id,
      periodEnd: prevPrevPeriod.end.toISOString().split('T')[0],
    },
  });

  const rolloverIn = prevSnapshot ? Number(prevSnapshot.rolloverOut) : 0;
  const available = Number(budget.amount) + rolloverIn;
  const rolloverOut = budget.rollover
    ? Math.max(0, available - spentAmount)
    : 0;

  await BudgetPeriodSnapshot.create({
    budgetId: budget.id,
    periodStart: period.start.toISOString().split('T')[0] as string,
    periodEnd: period.end.toISOString().split('T')[0] as string,
    budgetAmount: budget.amount,
    spentAmount,
    rolloverIn,
    rolloverOut,
  });
}

// -----------------------------------------------------------------------------
// BudgetCategory Service
// -----------------------------------------------------------------------------

/**
 * 驗證 categoryId 是否為 MainCategory（parentId 指向 Root Category）
 */
export async function isMainCategory(categoryId: string): Promise<boolean> {
  const category = await Category.findByPk(categoryId, {
    include: [{ model: Category, as: 'parent' }],
  });

  if (!category) {
    return false;
  }

  const parent = (category as any).parent;
  return parent && parent.parentId === null;
}

export interface CreateBudgetCategoryInput {
  categoryId: string;
  amount: number;
  isExcluded?: boolean;
}

export interface UpdateBudgetCategoryInput {
  amount?: number;
  isExcluded?: boolean;
}

/**
 * 取得預算的所有子分類
 */
export async function getBudgetCategories(budgetId: string, userId: string) {
  const budget = await Budget.findOne({ where: { id: budgetId, userId } });
  if (!budget) return null;

  return BudgetCategory.findAll({
    where: { budgetId },
    include: [{ model: Category, as: 'category' }],
  });
}

/**
 * 新增子預算
 */
export async function createBudgetCategory(
  budgetId: string,
  userId: string,
  input: CreateBudgetCategoryInput,
): Promise<{ error?: BudgetError; data?: any }> {
  const budget = await Budget.findOne({ where: { id: budgetId, userId } });
  if (!budget) return { error: BudgetError.BUDGET_NOT_FOUND };

  if (!(await isMainCategory(input.categoryId))) {
    return { error: BudgetError.NOT_MAIN_CATEGORY };
  }

  const existing = await BudgetCategory.findOne({
    where: { budgetId, categoryId: input.categoryId },
  });
  if (existing) return { error: BudgetError.ALREADY_EXISTS };

  const budgetCategory = await BudgetCategory.create({
    budgetId,
    categoryId: input.categoryId,
    amount: input.amount,
    isExcluded: input.isExcluded ?? false,
  });

  return { data: budgetCategory };
}

/**
 * 更新子預算
 */
export async function updateBudgetCategory(
  budgetId: string,
  budgetCategoryId: string,
  userId: string,
  input: UpdateBudgetCategoryInput,
): Promise<{ error?: BudgetError; data?: any }> {
  const budget = await Budget.findOne({ where: { id: budgetId, userId } });
  if (!budget) return { error: BudgetError.BUDGET_NOT_FOUND };

  const budgetCategory = await BudgetCategory.findOne({
    where: { id: budgetCategoryId, budgetId },
  });
  if (!budgetCategory) return { error: BudgetError.BUDGET_CATEGORY_NOT_FOUND };

  await budgetCategory.update(input);
  return { data: budgetCategory };
}

/**
 * 刪除子預算
 */
export async function deleteBudgetCategory(
  budgetId: string,
  budgetCategoryId: string,
  userId: string,
): Promise<{ error?: BudgetError; success?: boolean }> {
  const budget = await Budget.findOne({ where: { id: budgetId, userId } });
  if (!budget) return { error: BudgetError.BUDGET_NOT_FOUND };

  const budgetCategory = await BudgetCategory.findOne({
    where: { id: budgetCategoryId, budgetId },
  });
  if (!budgetCategory) return { error: BudgetError.BUDGET_CATEGORY_NOT_FOUND };

  await budgetCategory.destroy();
  return { success: true };
}

export default {
  getCurrentPeriod,
  getPreviousPeriod,
  calculateUsage,
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgetById,
  getAllBudgets,
  getBudgetWithUsage,
  getAllBudgetsWithUsage,
  // BudgetCategory
  isMainCategory,
  getBudgetCategories,
  createBudgetCategory,
  updateBudgetCategory,
  deleteBudgetCategory,
};
