import {
  CreateTransactionSchema,
  GetTransactionsByDateSchema,
  RootType,
  TransactionType,
  UpdateTransactionSchema,
  AccountType,
  CreateTransferSchema,
  TransactionTypeWhenOperate,
  GetTransactionsDashboardSummarySchema,
  PeriodType,
  PaymentFrequency,
  InterestType,
  CalculationMethod,
  RemainderPlacement,
  normalizeCurrencyCode,
  roundToBaseCurrency,
  TransactionTagBrief,
  TransactionSplitType,
  SplitInput,
  SPLIT_BALANCE_EPSILON,
} from '@repo/shared';
import { simplifyTransaction } from '@/utils/common';
import {
  Transaction,
  Account,
  InstallmentPlan,
  TransactionExtra,
  User,
  Tag,
  TransactionTag,
  TransactionSplit,
} from '@/models';
import { getRate } from './exchangeRateService';
import sequelize from '@/utils/postgres';
import { Op, Transaction as SequelizeTransaction } from 'sequelize';
import {
  format,
  getISOWeek,
  getYear,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  eachYearOfInterval,
  addMonths,
} from 'date-fns';

// 標籤：另撈一次中介表再貼回各筆，避免在分頁查詢直接 include 多對多造成 row 複製（spec §7）。
const loadTagsMap = async (
  transactionIds: string[],
): Promise<Record<string, TransactionTagBrief[]>> => {
  if (!transactionIds.length) return {};
  const rows = await TransactionTag.findAll({
    where: { transactionId: { [Op.in]: transactionIds } },
    include: [
      {
        model: Tag,
        as: 'tag',
        attributes: ['id', 'name', 'color', 'groupName'],
      },
    ],
    raw: true,
    nest: true,
  });
  const map: Record<string, TransactionTagBrief[]> = {};
  for (const r of rows as any[]) {
    if (!r.tag || r.tag.id == null) continue;
    (map[r.transactionId] ||= []).push(r.tag);
  }
  return map;
};

// 拆分子項：另撈再貼回各筆（供編輯預填與列表顯示）。DECIMAL 轉 number。
const loadSplitsMap = async (
  transactionIds: string[],
): Promise<Record<string, TransactionSplitType[]>> => {
  if (!transactionIds.length) return {};
  const rows = await TransactionSplit.findAll({
    where: { transactionId: { [Op.in]: transactionIds } },
    attributes: [
      'id',
      'transactionId',
      'categoryId',
      'amount',
      'amountInBase',
      'note',
      'sortOrder',
    ],
    order: [['sortOrder', 'ASC']],
    raw: true,
  });
  const map: Record<string, TransactionSplitType[]> = {};
  for (const r of rows as any[]) {
    (map[r.transactionId] ||= []).push({
      ...r,
      amount: Number(r.amount),
      amountInBase: Number(r.amountInBase),
    });
  }
  return map;
};

// 拆分（Phase B）：配平驗證（Σ 子項原幣 = 交易金額；至少 2 子項）
const assertSplitBalance = (amount: number, splits: SplitInput[]) => {
  if (splits.length < 2) throw new Error('拆分至少需 2 個子項');
  const sum = splits.reduce((s, x) => s + Number(x.amount), 0);
  if (Math.abs(sum - Number(amount)) > SPLIT_BALANCE_EPSILON) {
    throw new Error('子項金額加總須等於交易金額');
  }
};

// 重建子項：先全刪舊、再依輸入建新（amountInBase = amount × baseRate 快照）。
const writeSplits = async (
  transactionId: string,
  splits: SplitInput[],
  baseRate: number,
  t: SequelizeTransaction,
) => {
  await TransactionSplit.destroy({ where: { transactionId }, transaction: t });
  await TransactionSplit.bulkCreate(
    splits.map((s, i) => ({
      transactionId,
      categoryId: s.categoryId,
      amount: Number(s.amount),
      amountInBase: roundToBaseCurrency(Number(s.amount) * baseRate),
      note: s.note ?? null,
      sortOrder: i,
    })),
    { transaction: t },
  );
};

const getTransactionsByDate = async (
  query: GetTransactionsByDateSchema,
  userId: string,
) => {
  const {
    startDate,
    endDate,
    type,
    page = 1,
    limit: queryLimit,
    tagIds,
    ...otherFilters
  } = query;
  const limit = queryLimit ?? 10;

  let dateFilter = {};
  if (startDate && endDate) {
    dateFilter = {
      date: {
        [Op.between]: [startDate, endDate],
      },
    };
  }

  const offset = (Number(page) - 1) * Number(limit);

  let typeFilter: any = {};
  if (type === RootType.OPERATE) {
    typeFilter = {
      linkId: {
        [Op.ne]: null,
      },
      type: RootType.EXPENSE,
    };
  } else if (type) {
    typeFilter.type = type;
    typeFilter.linkId = null;
  } else {
    typeFilter[Op.or] = [
      { linkId: null },
      {
        linkId: { [Op.ne]: null },
        type: { [Op.ne]: RootType.INCOME },
      },
    ];
  }

  // 標籤篩選（match ANY）：先查符合任一 tag 的交易 id，再以 id IN (...) 限縮，
  // 避免在分頁查詢直接 join 多對多破壞 count（spec §7）。
  let tagFilter: any = {};
  if (tagIds && tagIds.length) {
    const tagged = await TransactionTag.findAll({
      where: { tagId: { [Op.in]: tagIds } },
      attributes: ['transactionId'],
      group: ['transactionId'],
      raw: true,
    });
    const ids = (tagged as any[]).map((x) => x.transactionId);
    if (!ids.length) {
      return {
        items: [],
        pagination: { total: 0, page, limit, totalPages: 0 },
      };
    }
    tagFilter = { id: { [Op.in]: ids } };
  }

  try {
    const { rows, count } = await Transaction.findAndCountAll({
      where: {
        ...otherFilters,
        ...dateFilter,
        ...typeFilter,
        ...tagFilter,
        userId,
      },
      limit: Number(limit),
      offset,
      order: [
        ['date', 'DESC'],
        ['time', 'DESC'],
      ],
      attributes: {
        exclude: ['createdAt', 'updatedAt', 'deletedAt', 'linkId'],
      },
      include: [
        {
          model: TransactionExtra,
          as: 'transactionExtra',
          attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt'] },
        },
      ],
      raw: true,
      nest: true,
    });
    // 貼回標籤與拆分子項（另撈，避免分頁 row 複製）
    const rowIds = (rows as any[]).map((r) => r.id);
    const tagMap = await loadTagsMap(rowIds);
    const splitMap = await loadSplitsMap(rowIds);
    const items = (rows as any[]).map((r) => ({
      ...r,
      tags: tagMap[r.id] || [],
      splits: splitMap[r.id] || [],
    }));
    return {
      items: items as unknown as TransactionType[],
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / Number(limit)),
      },
    };
  } catch (error) {
    console.error('DEBUG: getTransactionsByDate Failed:', error);
    throw error;
  }
};

const getTransactionsDashboardSummary = async (
  params: GetTransactionsDashboardSummarySchema,
  userId: string,
) => {
  const { startDate, endDate, groupBy = PeriodType.MONTH } = params;
  let dateFilter = {};

  if (startDate && endDate) {
    dateFilter = {
      date: {
        [Op.between]: [startDate, endDate],
      },
    };
  }

  const transactions = await Transaction.findAll({
    where: {
      ...dateFilter,
      userId,
      linkId: null as any,
    },
    attributes: ['amount', 'amountInBase', 'date', 'type', 'transactionExtraId'],
    include: [
      {
        model: TransactionExtra,
        as: 'transactionExtra',
      },
    ],
    raw: true,
    nest: true,
  });

  const start = new Date(startDate);
  const end = new Date(endDate);

  let buckets: {
    type: string;
    date: string;
    income: number;
    expense: number;
  }[] = [];

  if (groupBy === PeriodType.DAY) {
    const days = eachDayOfInterval({ start, end });
    buckets = days.map((d) => ({
      type: PeriodType.DAY,
      date: format(d, 'yyyy-MM-dd'),
      income: 0,
      expense: 0,
    }));
  } else if (groupBy === PeriodType.WEEK) {
    const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
    buckets = weeks.map((d) => {
      const year = getYear(d);
      const week = getISOWeek(d);
      return {
        type: PeriodType.WEEK,
        date: `${year}-W${String(week).padStart(2, '0')}`,
        income: 0,
        expense: 0,
      };
    });
  } else if (groupBy === PeriodType.MONTH) {
    const months = eachMonthOfInterval({ start, end });
    buckets = months.map((d) => ({
      type: PeriodType.MONTH,
      date: format(d, 'yyyy-MM'),
      income: 0,
      expense: 0,
    }));
  } else if (groupBy === PeriodType.YEAR) {
    const years = eachYearOfInterval({ start, end });
    buckets = years.map((d) => ({
      type: PeriodType.YEAR,
      date: format(d, 'yyyy'),
      income: 0,
      expense: 0,
    }));
  }

  const summary = {
    income: 0,
    expense: 0,
    balance: 0,
  };

  transactions.forEach((t: any) => {
    const data = t;
    const date = new Date(data.date);
    let key = '';

    if (groupBy === PeriodType.DAY) {
      key = format(date, 'yyyy-MM-dd');
    } else if (groupBy === PeriodType.WEEK) {
      const year = getYear(date);
      const week = getISOWeek(date);
      key = `${year}-W${String(week).padStart(2, '0')}`;
    } else if (groupBy === PeriodType.MONTH) {
      key = format(date, 'yyyy-MM');
    } else if (groupBy === PeriodType.YEAR) {
      key = format(date, 'yyyy');
    }

    const bucket = buckets.find((b) => b.date === key);
    if (bucket) {
      // 一律以本位幣快照聚合（單幣時 amountInBase === amount，零回歸）
      const extraAdd = Number(data.transactionExtra?.extraAddInBase || 0);
      const extraMinus = Number(data.transactionExtra?.extraMinusInBase || 0);
      const amount = Number(data.amountInBase);

      if (data.type === RootType.INCOME) {
        const netAmount = amount - extraMinus + extraAdd;
        bucket.income += netAmount;
        summary.income += netAmount;
      } else if (data.type === RootType.EXPENSE) {
        const netAmount = amount + extraMinus - extraAdd;
        bucket.expense += netAmount;
        summary.expense += netAmount;
      }
    }
  });

  summary.balance = summary.income - summary.expense;

  return {
    trends: buckets,
    summary,
  };
};

const getTransactionById = async (id: string, userId: string) => {
  const instance = await Transaction.findOne({
    where: { id, userId },
  });

  if (instance) {
    const data = instance.toJSON() as TransactionType;
    const txId = data.id as string;
    const tagMap = await loadTagsMap([txId]);
    const splitMap = await loadSplitsMap([txId]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _omitId, ...other } = data;
    return {
      ...other,
      tags: tagMap[txId] || [],
      splits: splitMap[txId] || [],
    };
  }

  return null;
};

const calcAccountBalance = async (
  accountInstance: any,
  type: string,
  amount: number,
  extraAdd: number = 0,
  extraMinus: number = 0,
) => {
  let netAmount = Number(amount);

  if (type === RootType.EXPENSE) {
    // 支出 Net Amount = 金額 + 手續費 - 折扣
    netAmount = Number(amount) + Number(extraMinus) - Number(extraAdd);
    accountInstance.balance = Number(accountInstance.balance) - netAmount;
  } else if (type === RootType.INCOME) {
    // 收入 Net Amount = 金額 - 手續費 + 折扣
    netAmount = Number(amount) - Number(extraMinus) + Number(extraAdd);
    accountInstance.balance = Number(accountInstance.balance) + netAmount;
  }
};

// ---------------------------------------------------------------------------
// 多幣別 helper（Phase 2）
// ---------------------------------------------------------------------------

const getUserBaseCurrency = async (
  userId: string,
  t?: SequelizeTransaction,
): Promise<string> => {
  const user = await User.findByPk(userId, {
    attributes: ['baseCurrencyCode'],
    transaction: t,
  });
  return (user as any)?.baseCurrencyCode || 'TWD';
};

export interface ResolvedCurrencyFields {
  baseRate: number; // 帳戶幣別 → 本位幣
  exchangeRate: number | null; // 原幣 → 帳戶幣別
  originalCurrencyCode: string | null;
  originalAmount: number | null;
}

/**
 * 解析單筆交易的多幣別欄位。
 * - baseRate：帳戶幣別 → 本位幣（同幣 = 1；查無匯率時 fallback 1 並告警，避免落庫 NaN）。
 * - 原幣事實（選填）：原幣 == 帳戶幣別時視為無原幣，清空欄位。
 * amountInBase 由 model beforeSave hook 依 amount × baseRate 算出，這裡不直接算。
 */
const resolveCurrencyFields = async (
  data: {
    originalCurrencyCode?: string | null;
    originalAmount?: number | null;
    exchangeRate?: number | null;
    date?: string;
  },
  account: any,
  baseCurrencyCode: string,
): Promise<ResolvedCurrencyFields> => {
  // 帳戶缺 currencyCode（理論上不會，但防呆）視為本位幣 → baseRate 1、不查匯率
  const accountCurrency = account?.currencyCode || baseCurrencyCode;
  const rateDate = data.date;

  let baseRate = 1;
  if (accountCurrency !== baseCurrencyCode) {
    const r = await getRate(accountCurrency, baseCurrencyCode, rateDate);
    if (r == null) {
      console.warn(
        `[multicurrency] 缺少 ${accountCurrency}->${baseCurrencyCode} (${rateDate ?? 'today'}) 匯率，baseRate 暫用 1`,
      );
    } else {
      baseRate = r;
    }
  }

  let originalCurrencyCode = data.originalCurrencyCode
    ? normalizeCurrencyCode(data.originalCurrencyCode)
    : null;
  let originalAmount =
    data.originalAmount != null ? Number(data.originalAmount) : null;
  let exchangeRate = data.exchangeRate != null ? Number(data.exchangeRate) : null;

  // 原幣即帳戶幣別 → 不需記錄原幣事實
  if (originalCurrencyCode && originalCurrencyCode === accountCurrency) {
    originalCurrencyCode = null;
    originalAmount = null;
    exchangeRate = null;
  }

  return { baseRate, exchangeRate, originalCurrencyCode, originalAmount };
};

// 由 extra 原幣值 × baseRate 算本位幣快照（單幣 baseRate=1 時 = 原值）
const extraBaseSnapshot = (
  extraAdd: number,
  extraMinus: number,
  baseRate: number,
) => ({
  extraAddInBase: roundToBaseCurrency((Number(extraAdd) || 0) * baseRate),
  extraMinusInBase: roundToBaseCurrency((Number(extraMinus) || 0) * baseRate),
});

/**
 * 建立 TransactionExtra 並顯式寫入本位幣快照（extra*InBase = 原值 × baseRate）。
 * 不依賴 model hook，避免 hook 在跨幣時覆寫；單幣時 baseRate=1 → 快照 = 原值。
 */
const createExtraWithBase = async (
  values: {
    extraAdd: number;
    extraAddLabel: string;
    extraMinus: number;
    extraMinusLabel: string;
  },
  baseRate: number,
  t: SequelizeTransaction,
) =>
  TransactionExtra.create(
    {
      ...values,
      ...extraBaseSnapshot(values.extraAdd, values.extraMinus, baseRate),
    },
    { transaction: t },
  );

/**
 * Helper to generate installment description
 */
const getInstallmentDescription = (
  originalDesc: string,
  current: number,
  total: number,
) => {
  return `${originalDesc} (${current}/${total})`;
};

export const createTransaction = async (
  data: TransactionType & {
    installment?: CreateTransactionSchema['installment'];
    extraAdd?: number;
    extraAddLabel?: string;
    extraMinus?: number;
    extraMinusLabel?: string;
    tagIds?: string[];
    splits?: SplitInput[];
  },
  userId: string,
) => {
  const transaction = await sequelize.transaction();

  try {
    const account = await Account.findByPk(data.accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    // 多幣別：解析本位幣與本筆交易的 baseRate / 原幣欄位
    const baseCurrencyCode = await getUserBaseCurrency(userId, transaction);
    const currencyFields = await resolveCurrencyFields(
      data,
      account,
      baseCurrencyCode,
    );

    // 負數輸入處理：只取絕對值，不反轉類型
    let amount = Number(data.amount);
    let type = data.type;
    if (amount < 0) {
      amount = Math.abs(amount);
    }

    // 拆分（Phase B）：前置檢查 + 配平（僅收入/支出非分期；轉帳走 createTransfer 不會進此）
    const splits = Array.isArray(data.splits) ? data.splits : null;
    const isSplit = !!(splits && splits.length);
    if (isSplit) {
      if (data.installment) throw new Error('分期交易不可拆分');
      assertSplitBalance(amount, splits!);
    }

    // 額外金額處理：只有當有值時才建立關聯資料
    let transactionExtraId: string | null = null;
    const extraAdd = Number(data.extraAdd || 0);
    const extraMinus = Number(data.extraMinus || 0);

    if (extraAdd !== 0 || extraMinus !== 0) {
      const extra = await createExtraWithBase(
        {
          extraAdd,
          extraAddLabel: data.extraAddLabel || '折扣',
          extraMinus,
          extraMinusLabel: data.extraMinusLabel || '手續費',
        },
        currencyFields.baseRate,
        transaction,
      );
      transactionExtraId = extra.id;
    }

    let result = null;

    // Handle Installment Plan
    if (data.installment && data.installment.totalInstallments > 1) {
      // 1. 建立分期付款主計畫 InstallmentPlan
      // 分期付款債務邏輯：債務應扣除「原始金額」，而非 Net Amount
      const installmentPlan = await InstallmentPlan.create(
        {
          userId: userId,
          totalAmount: amount,
          totalInstallments: data.installment.totalInstallments,
          startDate: data.date,
          description: data.description,
          interestType: data.installment.interestType || InterestType.NONE,
          calculationMethod:
            data.installment.calculationMethod || CalculationMethod.ROUND,
          remainderPlacement:
            data.installment.remainderPlacement || RemainderPlacement.FIRST,
          gracePeriod: data.installment.gracePeriod || 0,
          rewardsType: data.installment.rewardsType,
        },
        { transaction },
      );

      // 2. 計算每期金額 (分期邏輯)
      const totalAmount = amount;
      const count = data.installment.totalInstallments;
      let monthlyAmount = totalAmount / count;

      // Apply rounding logic
      if (
        data.installment.calculationMethod === CalculationMethod.FLOOR ||
        data.installment.calculationMethod === CalculationMethod.CEIL ||
        data.installment.calculationMethod === CalculationMethod.ROUND
      ) {
        if (data.installment.calculationMethod === CalculationMethod.FLOOR) {
          monthlyAmount = Math.floor(monthlyAmount);
        } else if (
          data.installment.calculationMethod === CalculationMethod.CEIL
        ) {
          monthlyAmount = Math.ceil(monthlyAmount);
        } else {
          monthlyAmount = Math.round(monthlyAmount);
        }
      }

      // 3. 餘額分配處理 (Remainder)
      const calculatedTotal = monthlyAmount * count;
      let remainder = totalAmount - calculatedTotal;

      const firstInstallmentAmount =
        data.installment.remainderPlacement === RemainderPlacement.FIRST
          ? monthlyAmount + remainder
          : monthlyAmount;

      const lastInstallmentAmount =
        data.installment.remainderPlacement === RemainderPlacement.LAST
          ? monthlyAmount + remainder
          : monthlyAmount;

      const middleInstallmentAmount = monthlyAmount;

      for (let i = 1; i <= count; i++) {
        let currentAmount = middleInstallmentAmount;
        if (i === 1) currentAmount = firstInstallmentAmount;
        if (i === count) currentAmount = lastInstallmentAmount;

        const date = addMonths(new Date(data.date), i - 1);

        const createdInstallment = await Transaction.create(
          {
            ...data,
            userId,
            id: undefined, // Create new ID
            amount: currentAmount,
            type,
            description: getInstallmentDescription(
              data.description || '',
              i,
              count,
            ),
            date: format(date, 'yyyy-MM-dd'),
            billingDate: format(date, 'yyyy-MM-dd'),
            installmentPlanId: installmentPlan.id,
            // 多幣別：每期沿用帳戶 baseRate（hook 算 amountInBase）；原幣事實不拆分到各期
            baseRate: currencyFields.baseRate,
            exchangeRate: null,
            originalCurrencyCode: null,
            originalAmount: null,
          },
          { transaction },
        );
        // 標籤：每期交易都掛上相同標籤
        if (Array.isArray(data.tagIds) && data.tagIds.length) {
          await (createdInstallment as any).setTags(data.tagIds, {
            transaction,
          });
        }
      }

      await calcAccountBalance(account, type, amount, extraAdd, extraMinus);
      await account.save({ transaction });

      result = { success: true };
    } else {
      // Normal transaction
      const newTransaction = await Transaction.create(
        {
          ...data,
          amount,
          type,
          userId,
          billingDate: data.date,
          transactionExtraId,
          // 拆分（Phase B）：父為容器；categoryId 取第一個子項分類作列表顯示主分類（spec S3）
          categoryId: isSplit ? splits![0]!.categoryId : data.categoryId,
          isSplit,
          // 多幣別：baseRate 驅動 hook 算 amountInBase；原幣事實（已正規化/去重）
          baseRate: currencyFields.baseRate,
          exchangeRate: currencyFields.exchangeRate,
          originalCurrencyCode: currencyFields.originalCurrencyCode,
          originalAmount: currencyFields.originalAmount,
        },
        { transaction },
      );

      // 餘額仍只看父 net（amount + extra）；拆分不改餘額路徑（spec §6.1）
      await calcAccountBalance(account, type, amount, extraAdd, extraMinus);
      await account.save({ transaction });

      // 拆分：寫入子項（amountInBase = 子項原幣 × 父 baseRate 快照）
      if (isSplit) {
        await writeSplits(
          newTransaction.id!,
          splits!,
          currencyFields.baseRate,
          transaction,
        );
      }

      // 標籤：套用到整筆交易
      if (Array.isArray(data.tagIds) && data.tagIds.length) {
        await (newTransaction as any).setTags(data.tagIds, { transaction });
      }

      result = newTransaction.toJSON();
    }

    await transaction.commit();

    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

export const updateIncomeExpense = async (
  id: string,
  data: UpdateTransactionSchema & {
    extraAdd?: number;
    extraAddLabel?: string;
    extraMinus?: number;
    extraMinusLabel?: string;
  },
  userId: string,
) => {
  // 轉帳（含跨幣）編輯改走 updateTransfer：依 DB 中的 linkId 判定（前端送的 type 不可靠，
  // 編輯轉帳時會送 EXPENSE）。updateIncomeExpense 的對向同步會把兩 leg 強制同額，
  // 會破壞「from=來源幣、to=目標幣」的跨幣轉帳，故轉帳一律委派給用各 leg 自己幣別/
  // 金額/baseRate 重算的 updateTransfer。
  const existing = await Transaction.findOne({
    where: { id, userId },
    attributes: ['id', 'linkId'],
  });
  if (!existing) throw new Error('Transaction not found');
  if (existing.linkId) {
    return updateTransfer(id, data, userId);
  }

  const responseData = await simplifyTransaction(async (t) => {
    const transaction = await Transaction.findOne({
      where: { id, userId },
      include: [{ model: TransactionExtra, as: 'transactionExtra' }],
      transaction: t,
    });
    if (!transaction) throw new Error('Transaction not found');

    const oldAccount = await Account.findOne({
      where: { id: transaction.accountId!, userId },
      transaction: t,
    });
    if (!oldAccount) throw new Error('Old account not found');

    // 先沖銷舊交易 (Revert old transaction impact)
    const oldExtra = (transaction as any).transactionExtra;
    const oldExtraAdd = Number(oldExtra?.extraAdd || 0);
    const oldExtraMinus = Number(oldExtra?.extraMinus || 0);

    const revertType =
      transaction.type === RootType.INCOME ? RootType.EXPENSE : RootType.INCOME;
    // 沖銷時，需交換 extraAdd 與 extraMinus，才能正確還原 Net Amount
    // 因為 Income 與 Expense 的 Net Amount 公式中，加減項剛好相反
    await calcAccountBalance(
      oldAccount,
      revertType,
      Number(transaction.amount),
      oldExtraMinus, // Swap: Use oldExtraMinus as extraAdd for revert
      oldExtraAdd, // Swap: Use oldExtraAdd as extraMinus for revert
    );
    await oldAccount.save({ transaction: t });

    // 處理新資料的負數與計算 (Sign Conversion for New Data)
    // 支援部分更新：若未提供 amount/type，使用現有值
    let newAmount = Number(data.amount ?? transaction.amount);
    let newType = data.type ?? transaction.type;
    if (newAmount < 0) {
      newAmount = Math.abs(newAmount);
    }

    let newAccount = oldAccount;
    // 支援部分更新：只有當 accountId 有提供且與現有不同時才切換帳戶
    if (data.accountId && data.accountId !== transaction.accountId) {
      const account = await Account.findOne({
        where: { id: data.accountId, userId },
        transaction: t,
      });
      if (!account) throw new Error('New account not found');
      newAccount = account;
    }

    // 多幣別：依新帳戶幣別重算 baseRate 與原幣欄位（換帳戶可能換幣別）
    const baseCurrencyCode = await getUserBaseCurrency(userId, t);
    const newDate = data.date ?? (transaction.date as string);
    const currencyFields = await resolveCurrencyFields(
      {
        originalCurrencyCode: data.originalCurrencyCode,
        originalAmount: data.originalAmount,
        exchangeRate: data.exchangeRate,
        date: newDate,
      },
      newAccount,
      baseCurrencyCode,
    );

    // Handle TransactionExtra Update/Create/Delete（帶 baseRate 算本位幣快照）
    let newTransactionExtraId = transaction.transactionExtraId;
    const newExtraAdd = Number(data.extraAdd || 0);
    const newExtraMinus = Number(data.extraMinus || 0);

    if (newExtraAdd !== 0 || newExtraMinus !== 0) {
      // 若有額外金額，更新或建立 Extra 記錄
      if (transaction.transactionExtraId) {
        const extra = await TransactionExtra.findByPk(
          transaction.transactionExtraId,
          { transaction: t },
        );
        if (extra) {
          await extra.update(
            {
              extraAdd: newExtraAdd,
              extraAddLabel: data.extraAddLabel || '折扣',
              extraMinus: newExtraMinus,
              extraMinusLabel: data.extraMinusLabel || '手續費',
              ...extraBaseSnapshot(
                newExtraAdd,
                newExtraMinus,
                currencyFields.baseRate,
              ),
            },
            { transaction: t },
          );
        }
      } else {
        const extra = await createExtraWithBase(
          {
            extraAdd: newExtraAdd,
            extraAddLabel: data.extraAddLabel || '折扣',
            extraMinus: newExtraMinus,
            extraMinusLabel: data.extraMinusLabel || '手續費',
          },
          currencyFields.baseRate,
          t,
        );
        newTransactionExtraId = extra.id;
      }
    } else {
      // 若都為 0，自動刪除 Extra 記錄以節省空間
      if (transaction.transactionExtraId) {
        await TransactionExtra.destroy({
          where: { id: transaction.transactionExtraId },
          transaction: t,
        });
        newTransactionExtraId = null;
      }
    }

    await calcAccountBalance(
      newAccount,
      newType,
      newAmount,
      newExtraAdd,
      newExtraMinus,
    );
    await newAccount.save({ transaction: t });

    // 拆分（Phase B）：data.splits !== undefined 才動子項
    const splits =
      data.splits === undefined
        ? undefined
        : Array.isArray(data.splits)
          ? data.splits
          : [];
    let newIsSplit = (transaction as any).isSplit as boolean;
    let newCategoryId = data.categoryId ?? transaction.categoryId;
    if (splits !== undefined) {
      if (splits.length > 0) {
        assertSplitBalance(newAmount, splits);
        newIsSplit = true;
        newCategoryId = splits[0]!.categoryId; // 父顯示主分類取第一子項（spec S3）
      } else {
        newIsSplit = false; // 清空拆分，回到單一分類
      }
    } else if ((transaction as any).isSplit) {
      // 既有為拆分但本次未帶 splits：金額有變會破壞配平 → 擋下；僅改日期等則放行
      if (
        data.amount != null &&
        Number(newAmount) !== Number(transaction.amount)
      ) {
        throw new Error('拆分交易金額變動時須一併提供子項分配');
      }
    }

    await transaction.update(
      {
        ...data,
        amount: newAmount,
        type: newType,
        transactionExtraId: newTransactionExtraId,
        isSplit: newIsSplit,
        categoryId: newCategoryId,
        // 多幣別：baseRate 驅動 hook 重算 amountInBase；原幣欄位已正規化/去重
        baseRate: currencyFields.baseRate,
        exchangeRate: currencyFields.exchangeRate,
        originalCurrencyCode: currencyFields.originalCurrencyCode,
        originalAmount: currencyFields.originalAmount,
      },
      { transaction: t },
    );

    // 拆分：重建（有值）或清空（[]）子項
    if (splits !== undefined) {
      if (splits.length > 0) {
        await writeSplits(id, splits, currencyFields.baseRate, t);
      } else {
        await TransactionSplit.destroy({
          where: { transactionId: id },
          transaction: t,
        });
      }
    }

    // 標籤：undefined = 不動；[] = 清空；有值 = 取代
    if (data.tagIds !== undefined) {
      await (transaction as any).setTags(data.tagIds, { transaction: t });
    }

    // 轉帳（含跨幣）已於函式入口依 linkId 委派給 updateTransfer，
    // 走到這裡的交易必為非轉帳（linkId == null），故不再有對向同步邏輯。

    return transaction.toJSON();
  });

  return responseData;
};

export const deleteTransaction = async (id: string, userId: string) => {
  const responseData = await simplifyTransaction(async (t) => {
    const transaction = await Transaction.findOne({
      where: { id, userId },
      include: [{ model: TransactionExtra, as: 'transactionExtra' }],
      transaction: t,
    });
    if (!transaction) throw new Error('Transaction not found');

    const account = await Account.findOne({
      where: { id: transaction.accountId, userId },
      transaction: t,
    });
    if (!account) throw new Error('Account not found');

    const oldExtra = (transaction as any).transactionExtra;
    const oldExtraAdd = Number(oldExtra?.extraAdd || 0);
    const oldExtraMinus = Number(oldExtra?.extraMinus || 0);

    const revertType =
      transaction.type === RootType.INCOME ? RootType.EXPENSE : RootType.INCOME;
    // 沖銷時需交換 extraAdd 與 extraMinus
    await calcAccountBalance(
      account,
      revertType,
      Number(transaction.amount),
      oldExtraMinus, // Swap
      oldExtraAdd, // Swap
    );
    await account.save({ transaction: t });

    if (transaction.linkId) {
      const linkedTransaction = await Transaction.findOne({
        where: { id: transaction.linkId, userId },
        include: [{ model: TransactionExtra, as: 'transactionExtra' }],
        transaction: t,
      });

      if (linkedTransaction) {
        const linkedAccount = await Account.findOne({
          where: { id: linkedTransaction.accountId, userId },
          transaction: t,
        });

        if (linkedAccount) {
          const linkedExtra = (linkedTransaction as any).transactionExtra;
          const linkedExtraAdd = Number(linkedExtra?.extraAdd || 0);
          const linkedExtraMinus = Number(linkedExtra?.extraMinus || 0);

          const linkedRevertType =
            linkedTransaction.type === RootType.INCOME
              ? RootType.EXPENSE
              : RootType.INCOME;
          // 沖銷時需交換 extraAdd 與 extraMinus
          await calcAccountBalance(
            linkedAccount,
            linkedRevertType,
            Number(linkedTransaction.amount),
            linkedExtraMinus, // Swap
            linkedExtraAdd, // Swap
          );
          await linkedAccount.save({ transaction: t });
        }

        const linkedExtraId = linkedTransaction.transactionExtraId;
        await linkedTransaction.destroy({ transaction: t });
        if (linkedExtraId) {
          await TransactionExtra.destroy({
            where: { id: linkedExtraId },
            transaction: t,
          });
        }
      }
    }

    const extraId = transaction.transactionExtraId;
    await transaction.destroy({ transaction: t });
    if (extraId) {
      await TransactionExtra.destroy({
        where: { id: extraId },
        transaction: t,
      });
    }

    return transaction.toJSON();
  });

  return responseData;
};

const createTransfer = async (
  data: CreateTransferSchema,
  userId: string,
): Promise<{
  fromTransaction: TransactionTypeWhenOperate;
  toTransaction: TransactionTypeWhenOperate;
}> => {
  return simplifyTransaction(async (t) => {
    if (data.type !== RootType.OPERATE) throw new Error('Must be operate type');

    const fromAccount = await Account.findByPk(data.accountId, {
      transaction: t,
    });
    if (!fromAccount) throw new Error('From account not found');

    const toAccount = await Account.findByPk(data.targetAccountId, {
      transaction: t,
    });
    if (!toAccount) throw new Error('To account not found');

    // 跨幣：from leg = 來源幣金額；to leg = 目標幣實收額（同幣時 targetAmount 省略 = amount）
    const fromAmount = Math.abs(Number(data.amount));
    const toAmount =
      data.targetAmount != null
        ? Math.abs(Number(data.targetAmount))
        : fromAmount;

    // 各 leg 用各自帳戶幣別 → 本位幣 的匯率算 amountInBase（由 hook 完成）
    const baseCurrencyCode = await getUserBaseCurrency(userId, t);
    const fromCur = (fromAccount as any).currencyCode || baseCurrencyCode;
    const toCur = (toAccount as any).currencyCode || baseCurrencyCode;
    const fromBaseRate =
      fromCur === baseCurrencyCode
        ? 1
        : (await getRate(fromCur, baseCurrencyCode, data.date)) ?? 1;
    const toBaseRate =
      toCur === baseCurrencyCode
        ? 1
        : (await getRate(toCur, baseCurrencyCode, data.date)) ?? 1;

    // 隱含 FX（來源幣 → 目標幣）：優先用使用者輸入，否則由 toAmount/fromAmount 推得
    const fxRate =
      data.exchangeRate != null
        ? Number(data.exchangeRate)
        : fromAmount !== 0
          ? roundToBaseCurrency(toAmount / fromAmount)
          : null;

    const extraAdd = Number(data.extraAdd || 0);
    const extraMinus = Number(data.extraMinus || 0);
    let fromExtraId: string | null = null;
    if (extraAdd !== 0 || extraMinus !== 0) {
      const extra = await createExtraWithBase(
        {
          extraAdd,
          extraAddLabel: data.extraAddLabel || '折扣',
          extraMinus,
          extraMinusLabel: data.extraMinusLabel || '手續費',
        },
        fromBaseRate,
        t,
      );
      fromExtraId = extra.id;
    }

    const fromData = {
      ...data,
      type: RootType.EXPENSE,
      amount: fromAmount,
      billingDate: data.date,
      transactionExtraId: fromExtraId,
      baseRate: fromBaseRate,
      exchangeRate: fxRate,
      originalCurrencyCode: null,
      originalAmount: null,
    };

    const toData = {
      ...data,
      targetAccountId: data.accountId,
      accountId: data.targetAccountId,
      type: RootType.INCOME,
      amount: toAmount,
      billingDate: data.date,
      transactionExtraId: null, // 接收方通常不記錄手續費 (依簡單模型)
      baseRate: toBaseRate,
      exchangeRate: fxRate,
      originalCurrencyCode: null,
      originalAmount: null,
    };

    const fromTransaction = await Transaction.create(
      { ...fromData, userId },
      { transaction: t },
    );

    const toTransaction = await Transaction.create(
      { ...toData, userId },
      { transaction: t },
    );

    // 來源帳戶（來源幣）：扣除 (金額 + 手續費 - 折扣)
    await calcAccountBalance(
      fromAccount,
      fromData.type,
      fromAmount,
      extraAdd,
      extraMinus,
    );
    // 目的帳戶（目標幣）：增加 目標實收額 (無手續費)
    await calcAccountBalance(toAccount, toData.type, toAmount, 0, 0);

    await fromAccount.save({ transaction: t });
    await toAccount.save({ transaction: t });

    await fromTransaction.update(
      { linkId: toTransaction.id },
      { transaction: t },
    );
    await toTransaction.update(
      { linkId: fromTransaction.id },
      { transaction: t },
    );

    // 標籤：轉帳兩 leg 掛相同標籤
    if (Array.isArray(data.tagIds) && data.tagIds.length) {
      await (fromTransaction as any).setTags(data.tagIds, { transaction: t });
      await (toTransaction as any).setTags(data.tagIds, { transaction: t });
    }

    return {
      fromTransaction: fromTransaction.toJSON() as TransactionTypeWhenOperate,
      toTransaction: toTransaction.toJSON() as TransactionTypeWhenOperate,
    };
  });
};

/**
 * 編輯既有轉帳（操作）交易。
 *
 * 一筆轉帳由兩筆 Transaction 組成（透過 linkId 互相關聯）：
 *   - 來源側 (from)：type = EXPENSE，accountId = 來源帳戶，targetAccountId = 目標帳戶
 *   - 目標側 (to)  ：type = INCOME，accountId = 目標帳戶，targetAccountId = 來源帳戶
 * Excel 匯出時被動轉帳收入列 (INCOME + targetAccountId) 已被過濾，所以匯出/編輯帶回來的
 * id 一律是「來源側 (EXPENSE)」那一筆。這裡同時接受傳入 from 或 to 側的 id，內部會自動定位。
 *
 * 沖銷邏輯比照 updateIncomeExpense：先還原原本轉帳對來源/目標帳戶的餘額影響，
 * 再依新資料重新套用，整個過程包在同一個 DB transaction 中確保原子性。
 */
const updateTransfer = async (
  id: string,
  data: UpdateTransactionSchema & {
    targetAccountId?: string;
    targetAmount?: number;
    extraAdd?: number;
    extraAddLabel?: string;
    extraMinus?: number;
    extraMinusLabel?: string;
  },
  userId: string,
) => {
  return simplifyTransaction(async (t) => {
    // 以 where { id, userId } 驗證歸屬，避免越權編輯他人交易
    const primary = await Transaction.findOne({
      where: { id, userId },
      include: [{ model: TransactionExtra, as: 'transactionExtra' }],
      transaction: t,
    });
    if (!primary) throw new Error('Transaction not found');
    if (!primary.linkId) throw new Error('Not a transfer transaction');

    const linked = await Transaction.findOne({
      where: { id: primary.linkId, userId },
      include: [{ model: TransactionExtra, as: 'transactionExtra' }],
      transaction: t,
    });
    if (!linked) throw new Error('Linked transfer transaction not found');

    // 定位來源側 (EXPENSE) 與目標側 (INCOME)，不論傳進來的是哪一側
    const fromTx = primary.type === RootType.EXPENSE ? primary : linked;
    const toTx = primary.type === RootType.EXPENSE ? linked : primary;

    // 帳戶快取：同一帳戶可能同時是舊/新的來源或目標，需共用同一 instance 累加餘額
    const accountCache = new Map<string, any>();
    const loadAccount = async (accountId: string) => {
      if (accountCache.has(accountId)) return accountCache.get(accountId);
      const account = await Account.findOne({
        where: { id: accountId, userId },
        transaction: t,
      });
      if (!account) throw new Error('Account not found');
      accountCache.set(accountId, account);
      return account;
    };

    // ===== 1. 沖銷舊餘額 =====
    const fromExtra = (fromTx as any).transactionExtra;
    const oldFromExtraAdd = Number(fromExtra?.extraAdd || 0);
    const oldFromExtraMinus = Number(fromExtra?.extraMinus || 0);

    const oldFromAccount = await loadAccount(fromTx.accountId!);
    // 來源側原本是 EXPENSE，沖銷以 INCOME 並交換 extraAdd / extraMinus 還原 Net Amount
    await calcAccountBalance(
      oldFromAccount,
      RootType.INCOME,
      Number(fromTx.amount),
      oldFromExtraMinus,
      oldFromExtraAdd,
    );

    const oldToAccount = await loadAccount(toTx.accountId!);
    // 目標側原本是 INCOME（不含手續費），沖銷以 EXPENSE
    await calcAccountBalance(
      oldToAccount,
      RootType.EXPENSE,
      Number(toTx.amount),
      0,
      0,
    );

    // ===== 2. 計算新資料（跨幣：from / to 各自金額與匯率）=====
    const newFromAmount = Math.abs(Number(data.amount ?? fromTx.amount));
    const newToAmount =
      data.targetAmount != null
        ? Math.abs(Number(data.targetAmount))
        : // 未指定 targetAmount：金額有變且原為同額（同幣）時跟著變，否則沿用 to leg 原額
          data.amount != null && Number(fromTx.amount) === Number(toTx.amount)
          ? newFromAmount
          : Math.abs(Number(toTx.amount));

    const newSourceId = data.accountId ?? fromTx.accountId!;
    const newTargetId = data.targetAccountId ?? toTx.accountId!;

    const newDate = data.date ?? (fromTx.date as string);
    const newTime = data.time ?? (fromTx.time as string);
    const newDescription =
      data.description !== undefined ? data.description : fromTx.description;
    const newCategoryId = data.categoryId ?? fromTx.categoryId;
    const newReceipt =
      data.receipt !== undefined ? data.receipt : fromTx.receipt;

    const newFromExtraAdd = Number(data.extraAdd || 0);
    const newFromExtraMinus = Number(data.extraMinus || 0);

    // 先載入新來源/目標帳戶並算各自 baseRate（hook 算 amountInBase；extra 也需 from baseRate）
    const newFromAccount = await loadAccount(newSourceId);
    const newToAccount = await loadAccount(newTargetId);
    const baseCurrencyCode = await getUserBaseCurrency(userId, t);
    const newFromCur = (newFromAccount as any).currencyCode || baseCurrencyCode;
    const newToCur = (newToAccount as any).currencyCode || baseCurrencyCode;
    const newFromBaseRate =
      newFromCur === baseCurrencyCode
        ? 1
        : (await getRate(newFromCur, baseCurrencyCode, newDate)) ?? 1;
    const newToBaseRate =
      newToCur === baseCurrencyCode
        ? 1
        : (await getRate(newToCur, baseCurrencyCode, newDate)) ?? 1;
    const newFxRate =
      data.exchangeRate != null
        ? Number(data.exchangeRate)
        : newFromAmount !== 0
          ? roundToBaseCurrency(newToAmount / newFromAmount)
          : null;

    // ===== 3. 處理來源側 TransactionExtra（更新 / 建立 / 刪除；帶 from baseRate）=====
    let newFromExtraId = fromTx.transactionExtraId;
    if (newFromExtraAdd !== 0 || newFromExtraMinus !== 0) {
      if (fromTx.transactionExtraId) {
        const extra = await TransactionExtra.findByPk(
          fromTx.transactionExtraId,
          { transaction: t },
        );
        if (extra) {
          await extra.update(
            {
              extraAdd: newFromExtraAdd,
              extraAddLabel: data.extraAddLabel || '折扣',
              extraMinus: newFromExtraMinus,
              extraMinusLabel: data.extraMinusLabel || '手續費',
              ...extraBaseSnapshot(
                newFromExtraAdd,
                newFromExtraMinus,
                newFromBaseRate,
              ),
            },
            { transaction: t },
          );
        }
      } else {
        const extra = await createExtraWithBase(
          {
            extraAdd: newFromExtraAdd,
            extraAddLabel: data.extraAddLabel || '折扣',
            extraMinus: newFromExtraMinus,
            extraMinusLabel: data.extraMinusLabel || '手續費',
          },
          newFromBaseRate,
          t,
        );
        newFromExtraId = extra.id;
      }
    } else if (fromTx.transactionExtraId) {
      await TransactionExtra.destroy({
        where: { id: fromTx.transactionExtraId },
        transaction: t,
      });
      newFromExtraId = null;
    }

    // ===== 4. 套用新餘額（各帳戶用各自幣金額）=====
    // 來源帳戶（來源幣）：扣除 (金額 + 手續費 - 折扣)
    await calcAccountBalance(
      newFromAccount,
      RootType.EXPENSE,
      newFromAmount,
      newFromExtraAdd,
      newFromExtraMinus,
    );
    // 目標帳戶（目標幣）：增加目標實收額（無手續費）
    await calcAccountBalance(newToAccount, RootType.INCOME, newToAmount, 0, 0);

    // 每個 distinct 帳戶只存一次（沖銷與套用都在同一 instance 上累加）
    for (const account of accountCache.values()) {
      await account.save({ transaction: t });
    }

    // ===== 5. 更新兩筆交易紀錄 =====
    const newReconciled =
      data.isReconciled !== undefined
        ? data.isReconciled
        : fromTx.isReconciled;
    const newReconciliationDate =
      data.reconciliationDate !== undefined
        ? data.reconciliationDate
        : fromTx.reconciliationDate;

    await fromTx.update(
      {
        accountId: newSourceId,
        targetAccountId: newTargetId,
        amount: newFromAmount,
        type: RootType.EXPENSE,
        date: newDate,
        time: newTime,
        billingDate: newDate,
        description: newDescription,
        categoryId: newCategoryId,
        receipt: newReceipt,
        transactionExtraId: newFromExtraId,
        isReconciled: newReconciled,
        reconciliationDate: newReconciliationDate,
        // 多幣別：重設 baseRate（hook 重算 amountInBase）與隱含 FX
        baseRate: newFromBaseRate,
        exchangeRate: newFxRate,
      },
      { transaction: t },
    );

    await toTx.update(
      {
        accountId: newTargetId,
        targetAccountId: newSourceId,
        amount: newToAmount,
        type: RootType.INCOME,
        date: newDate,
        time: newTime,
        billingDate: newDate,
        description: newDescription,
        categoryId: newCategoryId,
        receipt: newReceipt,
        isReconciled: newReconciled,
        reconciliationDate: newReconciliationDate,
        baseRate: newToBaseRate,
        exchangeRate: newFxRate,
      },
      { transaction: t },
    );

    // 標籤：undefined = 不動；有值/空 = 兩 leg 一起取代
    if (data.tagIds !== undefined) {
      await (fromTx as any).setTags(data.tagIds, { transaction: t });
      await (toTx as any).setTags(data.tagIds, { transaction: t });
    }

    return {
      fromTransaction: fromTx.toJSON(),
      toTransaction: toTx.toJSON(),
    };
  });
};

export default {
  createTransaction,
  getTransactionsByDate,
  getTransactionById,
  updateIncomeExpense,
  deleteTransaction,
  createTransfer,
  updateTransfer,
  getTransactionsDashboardSummary,
};
