/**
 * 預算 Service — YNAB Phase 1 MVP。
 *
 * 唯一儲存狀態 = budget_assignment；其餘皆為推導值。
 * 見 docs/specs/budget-ynab-spec.md §5。
 */

import { Op, QueryTypes } from 'sequelize';
import sequelize from '@/utils/postgres';
import {
  User,
  Account,
  Category,
  BudgetAssignment,
} from '@/models';
import { getRate } from './exchangeRateService';
import {
  computeMonthView,
  generateMonthRange,
  UNCLASSIFIED_OUT_ID,
} from '@/logic/budgetLogic';
import type { CategoryMeta } from '@/logic/budgetLogic';
import {
  RootType,
  roundToBaseCurrency,
} from '@repo/shared';
import type {
  BudgetMonthView,
  BudgetStatus,
} from '@repo/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SCHEMA = 'accounting';

/** 月末日期（手動格式化——toISOString 是 UTC，在 UTC+ 時區會往前偏移一天） */
function endOfMonth(monthStr: string): string {
  const parts = monthStr.split('-').map(Number);
  const lastDay = new Date(parts[0]!, parts[1]!, 0).getDate();
  return `${parts[0]}-${String(parts[1]).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

/** 當月 1 號 */
function currentMonth1st(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

/** 取使用者預算起始月；未啟用即拋錯 */
async function getEnabledStartMonth(userId: string): Promise<string> {
  const user = await User.findByPk(userId, { attributes: ['budgetStartMonth'] });
  if (!user) throw new Error('User not found');
  if (!user.budgetStartMonth) throw new Error('預算尚未啟用');
  return user.budgetStartMonth;
}

/** 月份須在 [startMonth, 當月]——未來月份分配為 Phase 2 功能 */
function assertMonthInRange(month: string, start: string): void {
  const current = currentMonth1st();
  if (month < start || month > current) {
    throw new Error(`月份 ${month} 不在有效範圍 [${start}, ${current}]`);
  }
}

/**
 * startMonth 不可為未來月份——否則 getMonthView 的 [start, 當月] 為空集合，
 * 任何月份請求都拋錯，預算頁永久卡在載入且無 UI 自救（budget-ynab review M1）。
 */
function assertStartMonthNotFuture(startMonth: string): void {
  const current = currentMonth1st();
  if (startMonth > current) {
    throw new Error(`起始月 ${startMonth} 不可為未來月份（當月為 ${current}）`);
  }
}

// ---------------------------------------------------------------------------
// getStatus
// ---------------------------------------------------------------------------

export const getStatus = async (userId: string): Promise<BudgetStatus> => {
  const user = await User.findByPk(userId, {
    attributes: ['budgetStartMonth', 'baseCurrencyCode'],
  });
  if (!user) throw new Error('User not found');
  return {
    enabled: user.budgetStartMonth != null,
    startMonth: user.budgetStartMonth ?? null,
    baseCurrencyCode: (user as any).baseCurrencyCode,
    // 由伺服器決定「當月」，前端據此 clamp 月份上界與預設選月——
    // 避免前端用瀏覽器本地時間、後端用伺服器時間造成月初時區落差使頁面打不開
    // （budget-ynab review M3）
    currentMonth: currentMonth1st(),
  };
};

// ---------------------------------------------------------------------------
// init
// ---------------------------------------------------------------------------

export const initBudget = async (
  userId: string,
  startMonth: string,
  accountOverrides?: Array<{ accountId: string; onBudget: boolean }>,
): Promise<void> => {
  const user = await User.findByPk(userId);
  if (!user) throw new Error('User not found');
  if (user.budgetStartMonth != null) {
    throw new Error('預算已啟用，不可重複初始化');
  }
  assertStartMonthNotFuture(startMonth);

  await sequelize.transaction(async (t) => {
    if (accountOverrides?.length) {
      for (const ov of accountOverrides) {
        await Account.update(
          { onBudget: ov.onBudget },
          { where: { id: ov.accountId, userId }, transaction: t },
        );
      }
    }
    await user.update({ budgetStartMonth: startMonth }, { transaction: t });
  });
};

// ---------------------------------------------------------------------------
// updateSettings
// ---------------------------------------------------------------------------

export const updateSettings = async (
  userId: string,
  startMonth: string,
): Promise<void> => {
  const user = await User.findByPk(userId);
  if (!user) throw new Error('User not found');
  assertStartMonthNotFuture(startMonth);
  await user.update({ budgetStartMonth: startMonth });
};

// ---------------------------------------------------------------------------
// getMonthView
// ---------------------------------------------------------------------------

export const getMonthView = async (
  userId: string,
  targetMonth: string,
): Promise<BudgetMonthView> => {
  const user = await User.findByPk(userId);
  if (!user) throw new Error('User not found');
  const start = user.budgetStartMonth;
  if (!start) throw new Error('預算尚未啟用');

  const baseCurrency = (user as any).baseCurrencyCode || 'TWD';

  assertMonthInRange(targetMonth, start);

  // --- (1) startRTA ---
  const startRTA = await computeStartRTA(userId, start, baseCurrency);

  // --- (2) Activity ---
  const lastMonth = endOfMonth(targetMonth);
  const activityRows: Array<{
    month: string;
    mainCategoryId: string;
    outflow: string;
  }> = await sequelize.query(
    `
    SELECT
      TO_CHAR(DATE_TRUNC('month', t."date"), 'YYYY-MM-DD') AS month,
      CASE
        WHEN t."linkId" IS NOT NULL THEN :unclassifiedOut
        WHEN p."parentId" IS NULL   THEN c."id"::text
        ELSE c."parentId"::text
      END AS "mainCategoryId",
      SUM(
        t."amountInBase"
        + COALESCE(e."extraMinusInBase", 0)
        - COALESCE(e."extraAddInBase", 0)
      ) AS outflow
    FROM "${SCHEMA}"."transaction" t
    JOIN "${SCHEMA}"."account" a ON a."id" = t."accountId"
    JOIN "${SCHEMA}"."category" c ON c."id" = t."categoryId"
    LEFT JOIN "${SCHEMA}"."category" p ON p."id" = c."parentId"
    LEFT JOIN "${SCHEMA}"."transaction_extra" e ON e."id" = t."transactionExtraId"
    WHERE t."userId" = :userId
      AND t."deletedAt" IS NULL
      AND a."onBudget" = true
      AND t."date" >= :start
      AND t."date" <= :lastMonth
      AND t."type" = :expenseType
      AND (
        t."linkId" IS NULL
        OR EXISTS (
          SELECT 1 FROM "${SCHEMA}"."transaction" lt
          JOIN "${SCHEMA}"."account" la ON la."id" = lt."accountId"
          WHERE lt."id" = t."linkId" AND la."onBudget" = false
        )
      )
    GROUP BY 1, 2
    `,
    {
      replacements: {
        userId,
        start,
        lastMonth,
        expenseType: RootType.EXPENSE,
        unclassifiedOut: UNCLASSIFIED_OUT_ID,
      },
      type: QueryTypes.SELECT,
    },
  );

  const activityByCatMonth: Record<string, Record<string, number>> = {};
  for (const row of activityRows) {
    if (!activityByCatMonth[row.mainCategoryId]) {
      activityByCatMonth[row.mainCategoryId] = {};
    }
    // activity = −outflow（支出為正 outflow → 負 activity）
    activityByCatMonth[row.mainCategoryId]![row.month] = roundToBaseCurrency(
      -Number(row.outflow),
    );
  }

  // --- (3) Inflow ---
  const inflowRows: Array<{ month: string; inflow: string }> =
    await sequelize.query(
      `
    SELECT
      TO_CHAR(DATE_TRUNC('month', t."date"), 'YYYY-MM-DD') AS month,
      SUM(
        t."amountInBase"
        + COALESCE(e."extraAddInBase", 0)
        - COALESCE(e."extraMinusInBase", 0)
      ) AS inflow
    FROM "${SCHEMA}"."transaction" t
    JOIN "${SCHEMA}"."account" a ON a."id" = t."accountId"
    LEFT JOIN "${SCHEMA}"."transaction_extra" e ON e."id" = t."transactionExtraId"
    WHERE t."userId" = :userId
      AND t."deletedAt" IS NULL
      AND a."onBudget" = true
      AND t."date" >= :start
      AND t."date" <= :lastMonth
      AND t."type" = :incomeType
      AND (
        t."linkId" IS NULL
        OR EXISTS (
          SELECT 1 FROM "${SCHEMA}"."transaction" lt
          JOIN "${SCHEMA}"."account" la ON la."id" = lt."accountId"
          WHERE lt."id" = t."linkId" AND la."onBudget" = false
        )
      )
    GROUP BY 1
    `,
      {
        replacements: {
          userId,
          start,
          lastMonth,
          incomeType: RootType.INCOME,
        },
        type: QueryTypes.SELECT,
      },
    );

  const inflowByMonth: Record<string, number> = {};
  for (const row of inflowRows) {
    inflowByMonth[row.month] = roundToBaseCurrency(Number(row.inflow));
  }

  // --- (4) Assignments ---
  const assignments = await BudgetAssignment.findAll({
    where: {
      userId,
      month: {
        [Op.gte]: start,
        [Op.lte]: targetMonth,
      },
    },
  });

  const assignedByCatMonth: Record<string, Record<string, number>> = {};
  for (const a of assignments) {
    const cid = a.categoryId;
    const m = a.month;
    if (!assignedByCatMonth[cid]) assignedByCatMonth[cid] = {};
    assignedByCatMonth[cid]![m] = Number(a.assigned);
  }

  // --- (5) 分類 metadata ---
  // 支出 Main 層分類 = parentId 指向 type='支出' 的 Root 分類
  const expenseRoots = await Category.findAll({
    where: { type: RootType.EXPENSE, parentId: null },
    attributes: ['id'],
  });
  const rootIds = expenseRoots.map((c) => c.id);

  const mainCats = await Category.findAll({
    where: {
      parentId: { [Op.in]: rootIds },
      [Op.or]: [{ userId: null }, { userId }],
    },
    attributes: ['id', 'name', 'icon', 'color'],
    order: [['createdAt', 'ASC']],
  });

  const categories: CategoryMeta[] = mainCats.map((c) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
    color: c.color,
  }));

  // 已刪除（或非 Main 的歷史殘留）但仍有 activity / assigned 的分類也保留為信封：
  // 歷史支出維持沖銷（負 available 月底計入 overspending 扣 RTA），
  // 與統計頁保留已刪分類歷史的慣例一致；否則該筆已花掉的錢會從預算中憑空消失
  const knownIds = new Set(categories.map((c) => c.id));
  const orphanIds = [
    ...new Set([
      ...Object.keys(activityByCatMonth),
      ...Object.keys(assignedByCatMonth),
    ]),
  ].filter((id) => id !== UNCLASSIFIED_OUT_ID && !knownIds.has(id));
  if (orphanIds.length > 0) {
    const orphanCats = await Category.findAll({
      where: { id: { [Op.in]: orphanIds } },
      attributes: ['id', 'name', 'icon', 'color', 'deletedAt'],
      paranoid: false,
    });
    for (const c of orphanCats) {
      categories.push({
        id: c.id,
        name: (c as any).deletedAt ? `${c.name}（已刪除）` : c.name,
        icon: c.icon,
        color: c.color,
      });
    }
  }

  // 加入 UNCLASSIFIED_OUT 虛擬信封（若有活動資料）
  const hasUnclassified = Object.keys(
    activityByCatMonth[UNCLASSIFIED_OUT_ID] ?? {},
  ).length > 0;
  if (hasUnclassified) {
    categories.push({
      id: UNCLASSIFIED_OUT_ID,
      name: '轉出（未分類）',
      icon: null,
      color: null,
    });
  }

  // --- (6) 純函式 fold ---
  return computeMonthView({
    startMonth: start,
    targetMonth,
    startRTA,
    inflowByMonth,
    assignedByCatMonth,
    activityByCatMonth,
    categories,
  });
};

// ---------------------------------------------------------------------------
// startRTA 動態推導
// ---------------------------------------------------------------------------

async function computeStartRTA(
  userId: string,
  startMonth: string,
  baseCurrency: string,
): Promise<number> {
  const accounts = await Account.findAll({
    where: { userId, onBudget: true },
    attributes: ['id', 'balance', 'currencyCode'],
    // 含已刪除帳戶：帳戶 soft-delete 後其交易仍保留（統計頁同此慣例），預算視同
    // YNAB closed account 保留全部歷史——與聚合 SQL（不濾 a.deletedAt）互相一致。
    // isArchived 是普通欄位，預設查詢本來就包含歸檔帳戶。
    paranoid: false,
  });

  let startRTA = 0;
  const missing: string[] = [];

  for (const acc of accounts) {
    const accCur = acc.currencyCode || baseCurrency;

    // deltaSince = Σ(signed effect) of txns where accountId=acc, date >= start
    const [result]: any = await sequelize.query(
      `
      SELECT COALESCE(SUM(
        CASE
          WHEN t."type" = :incomeType
            THEN (t."amount" + COALESCE(e."extraAdd", 0) - COALESCE(e."extraMinus", 0))
          WHEN t."type" = :expenseType
            THEN -(t."amount" + COALESCE(e."extraMinus", 0) - COALESCE(e."extraAdd", 0))
          ELSE 0
        END
      ), 0) AS delta
      FROM "${SCHEMA}"."transaction" t
      LEFT JOIN "${SCHEMA}"."transaction_extra" e ON e."id" = t."transactionExtraId"
      WHERE t."accountId" = :accountId
        AND t."deletedAt" IS NULL
        AND t."date" >= :start
      `,
      {
        replacements: {
          accountId: acc.id,
          start: startMonth,
          incomeType: RootType.INCOME,
          expenseType: RootType.EXPENSE,
        },
        type: QueryTypes.SELECT,
      },
    );

    const delta = Number(result?.delta ?? 0);
    const balanceAtStart = Number(acc.balance) - delta;

    const rate = await getRate(accCur, baseCurrency, startMonth);
    if (rate == null) {
      missing.push(`${accCur}->${baseCurrency}@${startMonth}`);
      continue;
    }
    startRTA += roundToBaseCurrency(balanceAtStart * rate);
  }

  if (missing.length > 0) {
    throw new Error(
      `缺少下列匯率，無法計算預算起始餘額：${missing.join(', ')}`,
    );
  }

  return roundToBaseCurrency(startRTA);
}

// ---------------------------------------------------------------------------
// assign
// ---------------------------------------------------------------------------

export const assign = async (
  userId: string,
  month: string,
  categoryId: string,
  assigned: number,
): Promise<void> => {
  const start = await getEnabledStartMonth(userId);
  assertMonthInRange(month, start);

  // 驗證 categoryId 為支出 Main 層
  await validateExpenseMainCategory(categoryId, userId);

  // 原子 upsert（依 UNIQUE(userId, categoryId, month)）——絕對值寫入，
  // 單一 SQL 語句避免 read-modify-write 的並發遺失更新（budget-ynab review L7）
  await BudgetAssignment.upsert({ userId, categoryId, month, assigned });
};

// ---------------------------------------------------------------------------
// moveMoney
// ---------------------------------------------------------------------------

export const moveMoney = async (
  userId: string,
  month: string,
  fromCategoryId: string | null,
  toCategoryId: string | null,
  amount: number,
): Promise<void> => {
  const start = await getEnabledStartMonth(userId);
  assertMonthInRange(month, start);

  // 驗證非 null 的 categoryId 為支出 Main 層
  if (fromCategoryId) {
    await validateExpenseMainCategory(fromCategoryId, userId);
  }
  if (toCategoryId) {
    await validateExpenseMainCategory(toCategoryId, userId);
  }

  await sequelize.transaction(async (t) => {
    if (fromCategoryId) {
      const [fromRow] = await BudgetAssignment.findOrCreate({
        where: { userId, categoryId: fromCategoryId, month },
        defaults: { userId, categoryId: fromCategoryId, month, assigned: 0 },
        transaction: t,
      });
      await fromRow.update(
        { assigned: roundToBaseCurrency(Number(fromRow.assigned) - amount) },
        { transaction: t },
      );
    }
    if (toCategoryId) {
      const [toRow] = await BudgetAssignment.findOrCreate({
        where: { userId, categoryId: toCategoryId, month },
        defaults: { userId, categoryId: toCategoryId, month, assigned: 0 },
        transaction: t,
      });
      await toRow.update(
        { assigned: roundToBaseCurrency(Number(toRow.assigned) + amount) },
        { transaction: t },
      );
    }
  });
};

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

async function validateExpenseMainCategory(
  categoryId: string,
  userId: string,
): Promise<void> {
  const cat = await Category.findByPk(categoryId, {
    include: [{ model: Category, as: 'parent' }],
  });
  if (!cat) throw new Error(`分類 ${categoryId} 不存在`);

  // Main 層 = parentId 指向 Root 支出
  const parent = (cat as any).parent;
  if (!parent || parent.type !== RootType.EXPENSE || parent.parentId !== null) {
    throw new Error(`分類 ${cat.name} 不是支出 Main 層分類`);
  }

  // 全域分類（userId=null）或使用者自建
  if (cat.userId !== null && cat.userId !== userId) {
    throw new Error(`分類 ${cat.name} 不屬於此使用者`);
  }
}

export default {
  getStatus,
  initBudget,
  updateSettings,
  getMonthView,
  assign,
  moveMoney,
};
