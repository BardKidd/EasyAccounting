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
} from '@repo/shared';
import { simplifyTransaction } from '@/utils/common';
import {
  Transaction,
  Account,
  InstallmentPlan,
  TransactionExtra,
} from '@/models';
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

const getTransactionsByDate = async (
  query: GetTransactionsByDateSchema,
  userId: string
) => {
  const { startDate, endDate, type, page = 1, ...otherFilters } = query;
  const limit = 10;

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

  try {
    const { rows, count } = await Transaction.findAndCountAll({
      where: {
        ...otherFilters,
        ...dateFilter,
        ...typeFilter,
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
      raw: true,
    });
    return {
      items: rows as unknown as TransactionType[],
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
  userId: string
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

  const transactions = (await Transaction.findAll({
    where: {
      ...dateFilter,
      userId,
      linkId: null as any,
    },
    attributes: ['amount', 'date', 'type'],
    raw: true,
  })) as unknown as Pick<TransactionType, 'amount' | 'date' | 'type'>[];

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

  transactions.forEach((t) => {
    const date = new Date(t.date);
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
      if (t.type === RootType.INCOME) {
        const val = Number(t.amount);
        bucket.income += val;
        summary.income += val;
      } else if (t.type === RootType.EXPENSE) {
        const val = Number(t.amount);
        bucket.expense += val;
        summary.expense += val;
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
  let result: TransactionType | null = null;

  if (instance) {
    const data = instance.toJSON() as TransactionType;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...other } = data;
    return other;
  }

  return result;
};

const calcAccountBalance = async (
  accountInstance: any,
  type: string,
  amount: number,
  extraAdd: number = 0,
  extraMinus: number = 0
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

/**
 * Helper to generate installment description
 */
const getInstallmentDescription = (
  originalDesc: string,
  current: number,
  total: number
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
  },
  userId: string
) => {
  const transaction = await sequelize.transaction();

  try {
    const account = await Account.findByPk(data.accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    // 負數輸入處理：只取絕對值，不反轉類型
    let amount = Number(data.amount);
    let type = data.type;
    if (amount < 0) {
      amount = Math.abs(amount);
    }

    // 額外金額處理：只有當有值時才建立關聯資料
    let transactionExtraId: string | null = null;
    const extraAdd = Number(data.extraAdd || 0);
    const extraMinus = Number(data.extraMinus || 0);

    if (extraAdd !== 0 || extraMinus !== 0) {
      const extra = await TransactionExtra.create(
        {
          extraAdd,
          extraAddLabel: data.extraAddLabel || '折扣',
          extraMinus,
          extraMinusLabel: data.extraMinusLabel || '手續費',
        },
        { transaction }
      );
      transactionExtraId = extra.id;
    }

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
        { transaction }
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

        await Transaction.create(
          {
            ...data,
            userId,
            id: undefined, // Create new ID
            amount: currentAmount,
            type,
            description: getInstallmentDescription(
              data.description || '',
              i,
              count
            ),
            date: format(date, 'yyyy-MM-dd'),
            billingDate: format(date, 'yyyy-MM-dd'),
            installmentPlanId: installmentPlan.id,
          },
          { transaction }
        );
      }
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
        },
        { transaction }
      );

      await calcAccountBalance(account, type, amount, extraAdd, extraMinus);
      await account.save({ transaction });

      await transaction.commit();
      return newTransaction.toJSON();
    }

    await calcAccountBalance(account, type, amount, extraAdd, extraMinus);
    await account.save({ transaction });

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const updateIncomeExpense = async (
  id: string,
  data: UpdateTransactionSchema & {
    extraAdd?: number;
    extraAddLabel?: string;
    extraMinus?: number;
    extraMinusLabel?: string;
  },
  userId: string
) => {
  return simplifyTransaction(async (t) => {
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
      oldExtraAdd // Swap: Use oldExtraAdd as extraMinus for revert
    );
    await oldAccount.save({ transaction: t });

    // 處理新資料的負數與計算 (Sign Conversion for New Data)
    let newAmount = Number(data.amount);
    let newType = data.type;
    if (newAmount < 0) {
      newAmount = Math.abs(newAmount);
    }

    // Handle TransactionExtra Update/Create/Delete
    let newTransactionExtraId = transaction.transactionExtraId;
    const newExtraAdd = Number(data.extraAdd || 0);
    const newExtraMinus = Number(data.extraMinus || 0);

    if (newExtraAdd !== 0 || newExtraMinus !== 0) {
      // 若有額外金額，更新或建立 Extra 記錄
      if (transaction.transactionExtraId) {
        const extra = await TransactionExtra.findByPk(
          transaction.transactionExtraId,
          { transaction: t }
        );
        if (extra) {
          await extra.update(
            {
              extraAdd: newExtraAdd,
              extraAddLabel: data.extraAddLabel || '折扣',
              extraMinus: newExtraMinus,
              extraMinusLabel: data.extraMinusLabel || '手續費',
            },
            { transaction: t }
          );
        }
      } else {
        const extra = await TransactionExtra.create(
          {
            extraAdd: newExtraAdd,
            extraAddLabel: data.extraAddLabel || '折扣',
            extraMinus: newExtraMinus,
            extraMinusLabel: data.extraMinusLabel || '手續費',
          },
          { transaction: t }
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

    let newAccount = oldAccount;
    if (data.accountId !== transaction.accountId) {
      const account = await Account.findOne({
        where: { id: data.accountId, userId },
        transaction: t,
      });
      if (!account) throw new Error('New account not found');
      newAccount = account;
    }

    await calcAccountBalance(
      newAccount,
      newType,
      newAmount,
      newExtraAdd,
      newExtraMinus
    );
    await newAccount.save({ transaction: t });

    await transaction.update(
      {
        ...data,
        amount: newAmount,
        type: newType,
        transactionExtraId: newTransactionExtraId,
      },
      { transaction: t }
    );

    return transaction.toJSON();
  });
};

const deleteTransaction = async (id: string, userId: string) => {
  return simplifyTransaction(async (t) => {
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
      oldExtraAdd // Swap
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
            linkedExtraAdd // Swap
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
};

const createTransfer = async (
  data: CreateTransferSchema,
  userId: string
): Promise<{
  fromTransaction: TransactionTypeWhenOperate;
  toTransaction: TransactionTypeWhenOperate;
}> => {
  return simplifyTransaction(async (t) => {
    if (data.type !== RootType.OPERATE) throw new Error('Must be operate type');

    const extraAdd = Number(data.extraAdd || 0);
    const extraMinus = Number(data.extraMinus || 0);
    let fromExtraId: string | null = null;
    if (extraAdd !== 0 || extraMinus !== 0) {
      const extra = await TransactionExtra.create(
        {
          extraAdd,
          extraAddLabel: data.extraAddLabel || '折扣',
          extraMinus,
          extraMinusLabel: data.extraMinusLabel || '手續費',
        },
        { transaction: t }
      );
      fromExtraId = extra.id;
    }

    const fromData = {
      ...data,
      type: RootType.EXPENSE,
      billingDate: data.date,
      transactionExtraId: fromExtraId,
    };

    const toData = {
      ...data,
      targetAccountId: data.accountId,
      accountId: data.targetAccountId,
      type: RootType.INCOME,
      billingDate: data.date,
      transactionExtraId: null, // 接收方通常不記錄手續費 (依簡單模型)
    };

    const fromAccount = await Account.findByPk(data.accountId, {
      transaction: t,
    });
    if (!fromAccount) throw new Error('From account not found');

    const toAccount = await Account.findByPk(data.targetAccountId, {
      transaction: t,
    });
    if (!toAccount) throw new Error('To account not found');

    const fromTransaction = await Transaction.create(
      { ...fromData, userId },
      { transaction: t }
    );

    const toTransaction = await Transaction.create(
      { ...toData, userId },
      { transaction: t }
    );

    // 來源帳戶：扣除 (金額 + 手續費 - 折扣)
    await calcAccountBalance(
      fromAccount,
      fromData.type,
      fromData.amount,
      extraAdd,
      extraMinus
    );
    // 目的帳戶：增加 金額 (無手續費)
    await calcAccountBalance(toAccount, toData.type, toData.amount, 0, 0);

    await fromAccount.save({ transaction: t });
    await toAccount.save({ transaction: t });

    await fromTransaction.update(
      { linkId: toTransaction.id },
      { transaction: t }
    );
    await toTransaction.update(
      { linkId: fromTransaction.id },
      { transaction: t }
    );

    return {
      fromTransaction: fromTransaction.toJSON() as TransactionTypeWhenOperate,
      toTransaction: toTransaction.toJSON() as TransactionTypeWhenOperate,
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
  getTransactionsDashboardSummary,
};
