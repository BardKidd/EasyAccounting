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
import {
  getCurrentPeriod,
  getPreviousPeriod,
  checkAlertTrigger,
  calculateRolloverOut,
  AlertType,
  Period,
} from '@/logic/budgetLogic';

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

// -----------------------------------------------------------------------------
// Backtracking & Alerting Logic
// -----------------------------------------------------------------------------

export interface BudgetImpact {
  budgetId: string;
  date: string; // YYYY-MM-DD
}

/**
 * 處理交易變更對預算的影響
 * @param userId 使用者 ID
 * @param impacts 影響列表（包含預算ID和交易日期）
 */
export async function handleBudgetImpact(
  userId: string,
  impacts: BudgetImpact[],
): Promise<void> {
  // 1. 依 Budget ID 分組以避免重複處理
  const uniqueBudgets = new Map<string, string[]>(); // budgetId -> 日期列表[]

  impacts.forEach((impact) => {
    if (!uniqueBudgets.has(impact.budgetId)) {
      uniqueBudgets.set(impact.budgetId, []);
    }
    uniqueBudgets.get(impact.budgetId)?.push(impact.date);
  });

  // 2. 處理每個預算
  for (const [budgetId, dates] of uniqueBudgets) {
    const budget = await Budget.findByPk(budgetId);
    if (!budget) continue;

    // 排序日期以找出最早的影響
    dates.sort();
    const firstDate = dates[0];
    if (!firstDate) continue; // 根據上述邏輯不應發生
    const earliestDate = new Date(firstDate);
    const currentPeriod = getCurrentPeriod(budget, new Date());

    // 3. 檢查是否需要回溯（若最早影響日期在當前週期之前）
    // 注意：使用當日零時進行比較
    if (earliestDate < currentPeriod.start && budget.isRecurring) {
      console.log(
        `[Budget] Backtracking triggered for budget ${budget.name} from ${dates[0]}`,
      );
      await recalculateSnapshots(budget, earliestDate);
    }

    // 4. 總是檢查當前週期的警示
    // 該交易或回溯導致的結轉更新可能改變了當前週期的使用率
    await checkBudgetAlerts(budget);
  }
}

/**
 * 重新計算歷史快照 (Backtracking)
 */
async function recalculateSnapshots(
  budget: BudgetInstance,
  fromDate: Date,
): Promise<void> {
  // 找出所有可能受影響的快照（週期結束日 >= 變動日期）
  const snapshots = await BudgetPeriodSnapshot.findAll({
    where: {
      budgetId: budget.id,
      periodEnd: {
        [Op.gte]: fromDate.toISOString().split('T')[0],
      },
    },
    order: [['periodStart', 'ASC']],
  });

  if (snapshots.length === 0) return;

  // 標記預算為正在重新計算
  await budget.update({ isRecalculating: true });

  try {
    // 按時間順序遍歷快照
    for (const snapshot of snapshots) {
      const period: Period = {
        start: new Date(snapshot.periodStart),
        end: new Date(snapshot.periodEnd),
      };

      // 1. 重新計算花費金額
      const transactions = await Transaction.findAll({
        where: {
          userId: budget.userId,
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
        return sum + Math.abs(Number(tx.amount));
      }, 0);

      // 2. 重新計算結轉移入
      // 取得前一期的快照（可能在前一次迭代中已更新）
      const prevPeriod = getPreviousPeriod(budget, period.start);
      const prevSnapshot = await BudgetPeriodSnapshot.findOne({
        where: {
          budgetId: budget.id,
          periodEnd: prevPeriod.end.toISOString().split('T')[0],
        },
      });

      const rolloverIn = prevSnapshot ? Number(prevSnapshot.rolloverOut) : 0;

      // 3. 重新計算結轉移出
      const rolloverOut = calculateRolloverOut(
        Number(snapshot.budgetAmount), // 使用快照當下的預算額度
        spentAmount,
        rolloverIn,
        budget.rollover,
      );

      // 4. 更新快照
      await snapshot.update({
        spentAmount,
        rolloverIn,
        rolloverOut,
        lastRecalculatedAt: new Date(),
      });
    }
  } finally {
    // 重置重新計算狀態
    await budget.update({
      isRecalculating: false,
      lastRecalculatedAt: new Date(),
    });
  }
}

/**
 * 檢查並觸發預算警示
 */
async function checkBudgetAlerts(budget: BudgetInstance): Promise<void> {
  const currentPeriod = getCurrentPeriod(budget, new Date());
  const usageInfo = await calculateUsage(
    budget.id,
    budget.userId,
    currentPeriod,
  );

  const alerts = checkAlertTrigger(
    usageInfo.usageRate,
    budget.alert80SentAt,
    budget.alert100SentAt,
    currentPeriod.start,
  );

  for (const alert of alerts) {
    if (alert.shouldTrigger) {
      const now = new Date();
      if (alert.type === AlertType.USAGE_80) {
        console.log(
          `[Budget Alert] 80% threshold reached for ${budget.name}: ${usageInfo.usageRate}%`,
        );
        await budget.update({ alert80SentAt: now });
      } else if (alert.type === AlertType.USAGE_100) {
        console.log(
          `[Budget Alert] 100% threshold reached for ${budget.name}: ${usageInfo.usageRate}%`,
        );
        await budget.update({ alert100SentAt: now });
      }
    }
  }
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
  // Advanced
  handleBudgetImpact,
  recalculateSnapshots,
  checkBudgetAlerts,
};
