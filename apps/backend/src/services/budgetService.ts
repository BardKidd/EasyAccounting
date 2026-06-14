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
  BudgetTarget,
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
  BUDGET_MAX_FUTURE_MONTHS,
  Account as AccountEnum,
} from '@repo/shared';
import type {
  BudgetMonthView,
  BudgetStatus,
  BudgetTargetInfo,
  UpsertTargetInput,
  AutoAssignStrategy,
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

/** 月份字串 +n 個月（n 可負）；回傳該月 1 號 YYYY-MM-DD */
function addMonths(monthStr: string, n: number): string {
  const parts = monthStr.split('-').map(Number);
  let y = parts[0]!;
  let m = parts[1]! - 1 + n; // 轉 0-based 月索引再位移
  y += Math.floor(m / 12);
  m = ((m % 12) + 12) % 12;
  return `${y}-${String(m + 1).padStart(2, '0')}-01`;
}

/** 預算可操作的最遠未來月份（含）：當月 + BUDGET_MAX_FUTURE_MONTHS */
function maxBudgetMonth(): string {
  return addMonths(currentMonth1st(), BUDGET_MAX_FUTURE_MONTHS);
}

/** 取使用者預算起始月；未啟用即拋錯 */
async function getEnabledStartMonth(userId: string): Promise<string> {
  const user = await User.findByPk(userId, { attributes: ['budgetStartMonth'] });
  if (!user) throw new Error('User not found');
  if (!user.budgetStartMonth) throw new Error('預算尚未啟用');
  return user.budgetStartMonth;
}

/**
 * 月份須在 [startMonth, 當月 + BUDGET_MAX_FUTURE_MONTHS]。
 * Phase 2「未來月份預先分配」：放寬上界至未來數月。分配到未來月份即時反映於該月視圖的 RTA
 * ——fold 對 target > 當月 天然正確：未來無收入，故 RTA 由當月結轉再扣未來月份的 assigned，
 * 達成「預先分配即扣 RTA」。仍保留上界，避免無界 month 讓 generateMonthRange 月份迴圈爆炸。
 */
function assertMonthInRange(month: string, start: string): void {
  const max = maxBudgetMonth();
  if (month < start || month > max) {
    throw new Error(`月份 ${month} 不在有效範圍 [${start}, ${max}]`);
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

  // --- (1) 起始部位（startRTA 排除信用卡 + 各卡起始 carry + cards）---
  const { startRTA, ccStartCarry, cards } = await computeStartPositions(
    userId,
    start,
    baseCurrency,
  );
  const creditType = AccountEnum.CREDIT_CARD;

  // --- (2) Activity ---
  const lastMonth = endOfMonth(targetMonth);
  // 帶號 activity（Phase 2 P2-D7/D8）：
  //  - 支出 → 負 activity（沖銷信封）
  //  - 退款（type=收入 但分類 root 為「支出」，linkId NULL）→ 正 activity（回補信封），且自 inflow 排除
  //  - 跨邊界轉出 from-leg：分類 root 為「支出」→ roll-up 到該 Main（P2-D8 選填分類）；
  //    否則（轉帳/其他 root）→ 虛擬列 UNCLASSIFIED_OUT
  // rootType 取法：Main 的 parent 即 root（p.parentId IS NULL → p.type）；
  //               Sub 的 grandparent 為 root（pp.type）。故需 join 祖父層 pp。
  const activityRows: Array<{
    month: string;
    mainCategoryId: string;
    activity: string;
  }> = await sequelize.query(
    `
    SELECT
      TO_CHAR(DATE_TRUNC('month', t."date"), 'YYYY-MM-DD') AS month,
      CASE
        WHEN t."linkId" IS NOT NULL
             AND (CASE WHEN p."parentId" IS NULL THEN p."type" ELSE pp."type" END) <> :expenseType
          THEN :unclassifiedOut
        WHEN p."parentId" IS NULL THEN c."id"::text
        ELSE c."parentId"::text
      END AS "mainCategoryId",
      SUM(
        CASE
          WHEN t."type" = :expenseType
            THEN -(t."amountInBase" + COALESCE(e."extraMinusInBase", 0) - COALESCE(e."extraAddInBase", 0))
          ELSE  (t."amountInBase" + COALESCE(e."extraAddInBase", 0) - COALESCE(e."extraMinusInBase", 0))
        END
      ) AS activity
    FROM "${SCHEMA}"."transaction" t
    JOIN "${SCHEMA}"."account" a ON a."id" = t."accountId"
    JOIN "${SCHEMA}"."category" c ON c."id" = t."categoryId"
    LEFT JOIN "${SCHEMA}"."category" p ON p."id" = c."parentId"
    LEFT JOIN "${SCHEMA}"."category" pp ON pp."id" = p."parentId"
    LEFT JOIN "${SCHEMA}"."transaction_extra" e ON e."id" = t."transactionExtraId"
    WHERE t."userId" = :userId
      AND t."deletedAt" IS NULL
      AND a."onBudget" = true
      AND t."date" >= :start
      AND t."date" <= :lastMonth
      AND (
        -- (a) 一般支出 + 跨邊界轉出（含已分類/未分類）
        (
          t."type" = :expenseType
          AND (
            t."linkId" IS NULL
            OR EXISTS (
              SELECT 1 FROM "${SCHEMA}"."transaction" lt
              JOIN "${SCHEMA}"."account" la ON la."id" = lt."accountId"
              WHERE lt."id" = t."linkId" AND la."onBudget" = false
            )
          )
        )
        -- (b) 退款：收入但分類 root 為支出（linkId NULL，非轉帳）→ 正 activity 回補信封
        OR (
          t."type" = :incomeType
          AND t."linkId" IS NULL
          AND (CASE WHEN p."parentId" IS NULL THEN p."type" ELSE pp."type" END) = :expenseType
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
        incomeType: RootType.INCOME,
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
    // SQL 已輸出帶號 activity（支出負、退款收入正）
    activityByCatMonth[row.mainCategoryId]![row.month] = roundToBaseCurrency(
      Number(row.activity),
    );
  }

  // --- (3) Inflow ---
  // 一般收入 → RTA。Phase 2 P2-D7：退款（type=收入 但分類 root 為支出、linkId NULL）
  // 不算 inflow（已在 activity 以正值回補信封），故此處排除；轉帳 to-leg（linkId 非空）不受影響。
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
    JOIN "${SCHEMA}"."category" c ON c."id" = t."categoryId"
    LEFT JOIN "${SCHEMA}"."category" p ON p."id" = c."parentId"
    LEFT JOIN "${SCHEMA}"."category" pp ON pp."id" = p."parentId"
    LEFT JOIN "${SCHEMA}"."transaction_extra" e ON e."id" = t."transactionExtraId"
    WHERE t."userId" = :userId
      AND t."deletedAt" IS NULL
      AND a."onBudget" = true
      AND a."type" <> :creditType
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
      AND NOT (
        t."linkId" IS NULL
        AND (CASE WHEN p."parentId" IS NULL THEN p."type" ELSE pp."type" END) = :expenseType
      )
    GROUP BY 1
    `,
      {
        replacements: {
          userId,
          start,
          lastMonth,
          incomeType: RootType.INCOME,
          expenseType: RootType.EXPENSE,
          creditType,
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

  // 拆分：一般信封（categoryId）與 CC Payment（creditAccountId，Phase 2 ④）
  const assignedByCatMonth: Record<string, Record<string, number>> = {};
  const ccAssignedByCardMonth: Record<string, Record<string, number>> = {};
  for (const a of assignments) {
    const m = a.month;
    if (a.creditAccountId) {
      const cardId = a.creditAccountId;
      if (!ccAssignedByCardMonth[cardId]) ccAssignedByCardMonth[cardId] = {};
      ccAssignedByCardMonth[cardId]![m] = Number(a.assigned);
    } else if (a.categoryId) {
      const cid = a.categoryId;
      if (!assignedByCatMonth[cid]) assignedByCatMonth[cid] = {};
      assignedByCatMonth[cid]![m] = Number(a.assigned);
    }
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

  // --- (6) Targets（Phase 2 ③）---
  const targetRows = await BudgetTarget.findAll({ where: { userId } });
  const targetsByCat: Record<string, BudgetTargetInfo> = {};
  for (const tr of targetRows) {
    if (!tr.categoryId) continue;
    targetsByCat[tr.categoryId] = {
      type: tr.type,
      amount: Number(tr.amount),
      dueDate: tr.dueDate,
    };
  }

  // --- (7) 信用卡：刷卡支出（per envelope×card×month）+ 還款（per card×month）（Phase 2 ④）---
  const cardSpendByEnvCardMonth: Record<
    string,
    Record<string, Record<string, number>>
  > = {};
  const repayByCardMonth: Record<string, Record<string, number>> = {};

  if (cards.length > 0) {
    // (7a) 信用卡一般刷卡（linkId NULL 的 EXPENSE）→ roll-up 到 Main，正值
    const cardSpendRows: Array<{
      month: string;
      envId: string;
      cardId: string;
      spend: string;
    }> = await sequelize.query(
      `
      SELECT
        TO_CHAR(DATE_TRUNC('month', t."date"), 'YYYY-MM-DD') AS month,
        CASE WHEN p."parentId" IS NULL THEN c."id"::text ELSE c."parentId"::text END AS "envId",
        t."accountId" AS "cardId",
        SUM(t."amountInBase" + COALESCE(e."extraMinusInBase", 0) - COALESCE(e."extraAddInBase", 0)) AS spend
      FROM "${SCHEMA}"."transaction" t
      JOIN "${SCHEMA}"."account" a ON a."id" = t."accountId"
      JOIN "${SCHEMA}"."category" c ON c."id" = t."categoryId"
      LEFT JOIN "${SCHEMA}"."category" p ON p."id" = c."parentId"
      LEFT JOIN "${SCHEMA}"."transaction_extra" e ON e."id" = t."transactionExtraId"
      WHERE t."userId" = :userId
        AND t."deletedAt" IS NULL
        AND a."onBudget" = true
        AND a."type" = :creditType
        AND t."date" >= :start
        AND t."date" <= :lastMonth
        AND t."type" = :expenseType
        AND t."linkId" IS NULL
      GROUP BY 1, 2, 3
      `,
      {
        replacements: {
          userId,
          start,
          lastMonth,
          expenseType: RootType.EXPENSE,
          creditType,
        },
        type: QueryTypes.SELECT,
      },
    );
    for (const row of cardSpendRows) {
      const spend = roundToBaseCurrency(Number(row.spend));
      if (spend <= 0) continue;
      if (!cardSpendByEnvCardMonth[row.envId])
        cardSpendByEnvCardMonth[row.envId] = {};
      if (!cardSpendByEnvCardMonth[row.envId]![row.cardId])
        cardSpendByEnvCardMonth[row.envId]![row.cardId] = {};
      cardSpendByEnvCardMonth[row.envId]![row.cardId]![row.month] = spend;
    }

    // (7b) 還款：on-budget 非信用卡 → on-budget 信用卡 的轉帳 from-leg（EXPENSE），正值
    const repayRows: Array<{ month: string; cardId: string; amt: string }> =
      await sequelize.query(
        `
      SELECT
        TO_CHAR(DATE_TRUNC('month', t."date"), 'YYYY-MM-DD') AS month,
        t."targetAccountId" AS "cardId",
        SUM(t."amountInBase") AS amt
      FROM "${SCHEMA}"."transaction" t
      JOIN "${SCHEMA}"."account" a ON a."id" = t."accountId"
      JOIN "${SCHEMA}"."account" ta ON ta."id" = t."targetAccountId"
      WHERE t."userId" = :userId
        AND t."deletedAt" IS NULL
        AND t."type" = :expenseType
        AND t."linkId" IS NOT NULL
        AND a."onBudget" = true
        AND a."type" <> :creditType
        AND ta."onBudget" = true
        AND ta."type" = :creditType
        AND t."date" >= :start
        AND t."date" <= :lastMonth
      GROUP BY 1, 2
      `,
        {
          replacements: {
            userId,
            start,
            lastMonth,
            expenseType: RootType.EXPENSE,
            creditType,
          },
          type: QueryTypes.SELECT,
        },
      );
    for (const row of repayRows) {
      const amt = roundToBaseCurrency(Number(row.amt));
      if (!repayByCardMonth[row.cardId]) repayByCardMonth[row.cardId] = {};
      repayByCardMonth[row.cardId]![row.month] = amt;
    }
  }

  // --- (8) 純函式 fold ---
  return computeMonthView({
    startMonth: start,
    targetMonth,
    startRTA,
    inflowByMonth,
    assignedByCatMonth,
    activityByCatMonth,
    categories,
    targetsByCat,
    cards,
    cardSpendByEnvCardMonth,
    repayByCardMonth,
    ccAssignedByCardMonth,
    ccStartCarry,
  });
};

// ---------------------------------------------------------------------------
// startRTA 動態推導
// ---------------------------------------------------------------------------

interface StartPositions {
  startRTA: number;
  /** 各 on-budget 信用卡的起始 carry（= 起始日卡餘額×匯率；負 = 起始卡債） */
  ccStartCarry: Record<string, number>;
  /** 要顯示的 on-budget 信用卡（含已刪但仍有卡債者，標註「（已刪除）」） */
  cards: Array<{ id: string; name: string }>;
}

/**
 * 起始部位推導（Phase 2 ④）：
 *  - 現金/銀行等非信用卡 on-budget 帳戶 → 計入 startRTA。
 *  - 信用卡 on-budget 帳戶 → 不計入 RTA（負債不貢獻 RTA），其起始日餘額作為 CC Payment 的起始 carry。
 */
async function computeStartPositions(
  userId: string,
  startMonth: string,
  baseCurrency: string,
): Promise<StartPositions> {
  const accounts = await Account.findAll({
    where: { userId, onBudget: true },
    attributes: ['id', 'name', 'balance', 'currencyCode', 'type', 'deletedAt'],
    // 含已刪除帳戶：帳戶 soft-delete 後其交易仍保留（統計頁同此慣例），預算視同
    // YNAB closed account 保留全部歷史——與聚合 SQL（不濾 a.deletedAt）互相一致。
    paranoid: false,
  });

  let startRTA = 0;
  const ccStartCarry: Record<string, number> = {};
  const cards: Array<{ id: string; name: string }> = [];
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
    const startBase = roundToBaseCurrency(balanceAtStart * rate);

    if ((acc as any).type === AccountEnum.CREDIT_CARD) {
      ccStartCarry[acc.id] = startBase; // 通常為負（卡債）
      const isDeleted = (acc as any).deletedAt != null;
      // 非刪除卡一律顯示；已刪卡僅在仍有起始卡債時保留（標註已刪除）
      if (!isDeleted || startBase !== 0) {
        cards.push({
          id: acc.id,
          name: isDeleted ? `${acc.name}（已刪除）` : acc.name,
        });
      }
    } else {
      startRTA += startBase;
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `缺少下列匯率，無法計算預算起始餘額：${missing.join(', ')}`,
    );
  }

  return { startRTA: roundToBaseCurrency(startRTA), ccStartCarry, cards };
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
  await validateExpenseMainCategory(categoryId, userId);

  // findOrCreate+update（不用 .upsert()——partial unique index 的 ON CONFLICT 在
  // Sequelize 解析較脆弱）。絕對值寫入，包在交易內避免並發遺失更新。
  await sequelize.transaction(async (t) => {
    const [row] = await BudgetAssignment.findOrCreate({
      where: { userId, categoryId, month },
      defaults: { userId, categoryId, month, assigned: 0 },
      transaction: t,
    });
    await row.update(
      { assigned: roundToBaseCurrency(assigned) },
      { transaction: t },
    );
  });
};

/** CC Payment 信封分配（Phase 2 ④）：以信用卡 accountId 為錨，絕對值寫入 */
export const ccAssign = async (
  userId: string,
  month: string,
  creditAccountId: string,
  assigned: number,
): Promise<void> => {
  const start = await getEnabledStartMonth(userId);
  assertMonthInRange(month, start);
  await validateOnBudgetCreditCard(creditAccountId, userId);

  await sequelize.transaction(async (t) => {
    const [row] = await BudgetAssignment.findOrCreate({
      where: { userId, creditAccountId, month },
      defaults: { userId, creditAccountId, month, assigned: 0 },
      transaction: t,
    });
    await row.update(
      { assigned: roundToBaseCurrency(assigned) },
      { transaction: t },
    );
  });
};

// ---------------------------------------------------------------------------
// moveMoney（端點可為 分類信封 / CC Payment 信封 / RTA(null)，Phase 2 ④ 泛化）
// ---------------------------------------------------------------------------

async function adjustEnvelopeAssigned(
  t: any,
  userId: string,
  month: string,
  categoryId: string,
  delta: number,
): Promise<void> {
  const [row] = await BudgetAssignment.findOrCreate({
    where: { userId, categoryId, month },
    defaults: { userId, categoryId, month, assigned: 0 },
    transaction: t,
  });
  await row.update(
    { assigned: roundToBaseCurrency(Number(row.assigned) + delta) },
    { transaction: t },
  );
}

async function adjustCCAssigned(
  t: any,
  userId: string,
  month: string,
  creditAccountId: string,
  delta: number,
): Promise<void> {
  const [row] = await BudgetAssignment.findOrCreate({
    where: { userId, creditAccountId, month },
    defaults: { userId, creditAccountId, month, assigned: 0 },
    transaction: t,
  });
  await row.update(
    { assigned: roundToBaseCurrency(Number(row.assigned) + delta) },
    { transaction: t },
  );
}

export const moveMoney = async (
  userId: string,
  month: string,
  fromCategoryId: string | null,
  toCategoryId: string | null,
  amount: number,
  fromCreditAccountId: string | null = null,
  toCreditAccountId: string | null = null,
): Promise<void> => {
  const start = await getEnabledStartMonth(userId);
  assertMonthInRange(month, start);

  if (fromCategoryId) await validateExpenseMainCategory(fromCategoryId, userId);
  if (toCategoryId) await validateExpenseMainCategory(toCategoryId, userId);
  if (fromCreditAccountId)
    await validateOnBudgetCreditCard(fromCreditAccountId, userId);
  if (toCreditAccountId)
    await validateOnBudgetCreditCard(toCreditAccountId, userId);

  await sequelize.transaction(async (t) => {
    if (fromCategoryId)
      await adjustEnvelopeAssigned(t, userId, month, fromCategoryId, -amount);
    if (fromCreditAccountId)
      await adjustCCAssigned(t, userId, month, fromCreditAccountId, -amount);
    if (toCategoryId)
      await adjustEnvelopeAssigned(t, userId, month, toCategoryId, amount);
    if (toCreditAccountId)
      await adjustCCAssigned(t, userId, month, toCreditAccountId, amount);
  });
};

// ---------------------------------------------------------------------------
// Targets（Phase 2 ③ / P2-D10）
// ---------------------------------------------------------------------------

export const upsertTarget = async (
  userId: string,
  categoryId: string,
  input: UpsertTargetInput,
): Promise<void> => {
  await getEnabledStartMonth(userId); // 須已啟用預算
  await validateExpenseMainCategory(categoryId, userId);
  const dueDate =
    input.type === 'BALANCE_BY_DATE' ? input.dueDate ?? null : null;
  await BudgetTarget.upsert({
    userId,
    categoryId,
    type: input.type,
    amount: input.amount,
    dueDate,
  });
};

export const deleteTarget = async (
  userId: string,
  categoryId: string,
): Promise<void> => {
  await BudgetTarget.destroy({ where: { userId, categoryId } });
};

/**
 * Auto-Assign（P2-D10）：
 *  - UNDERFUNDED：對每個 underfunded>0 的信封 assigned += underfunded（補足 target 缺口）
 *  - LAST_MONTH：本月各信封 assigned 沿用上月值（覆寫）
 */
export const autoAssign = async (
  userId: string,
  month: string,
  strategy: AutoAssignStrategy,
): Promise<void> => {
  const start = await getEnabledStartMonth(userId);
  assertMonthInRange(month, start);

  if (strategy === 'UNDERFUNDED') {
    const view = await getMonthView(userId, month);
    const toFill = view.rows.filter((r) => r.underfunded > 0);
    if (toFill.length === 0) return;
    await sequelize.transaction(async (t) => {
      for (const row of toFill) {
        const [r] = await BudgetAssignment.findOrCreate({
          where: { userId, categoryId: row.categoryId, month },
          defaults: { userId, categoryId: row.categoryId, month, assigned: 0 },
          transaction: t,
        });
        await r.update(
          {
            assigned: roundToBaseCurrency(
              Number(r.assigned) + row.underfunded,
            ),
          },
          { transaction: t },
        );
      }
    });
    return;
  }

  // LAST_MONTH：沿用上月各信封 assigned（覆寫本月）
  const prev = addMonths(month, -1);
  if (prev < start) return; // 起始月之前無上月可沿用
  const prevAssignments = await BudgetAssignment.findAll({
    where: { userId, month: prev },
  });
  if (prevAssignments.length === 0) return;
  await sequelize.transaction(async (t) => {
    for (const pa of prevAssignments) {
      const [r] = await BudgetAssignment.findOrCreate({
        where: { userId, categoryId: pa.categoryId, month },
        defaults: { userId, categoryId: pa.categoryId, month, assigned: 0 },
        transaction: t,
      });
      await r.update({ assigned: pa.assigned }, { transaction: t });
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

/** 驗證 accountId 為此使用者的 on-budget 信用卡（CC Payment 寫入用） */
async function validateOnBudgetCreditCard(
  accountId: string,
  userId: string,
): Promise<void> {
  const acc = await Account.findOne({
    where: { id: accountId, userId },
    paranoid: false,
  });
  if (!acc) throw new Error(`帳戶 ${accountId} 不存在`);
  if ((acc as any).type !== AccountEnum.CREDIT_CARD) {
    throw new Error(`帳戶 ${acc.name} 不是信用卡`);
  }
  if (!(acc as any).onBudget) {
    throw new Error(`帳戶 ${acc.name} 非 on-budget，無 CC Payment 信封`);
  }
}

export default {
  getStatus,
  initBudget,
  updateSettings,
  getMonthView,
  assign,
  ccAssign,
  moveMoney,
  upsertTarget,
  deleteTarget,
  autoAssign,
};
