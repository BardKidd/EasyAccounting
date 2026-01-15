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
import { Transaction, Account, InstallmentPlan } from '@/models';
import sequelize from '@/utils/postgres';
import { Op } from 'sequelize';
import {
  isCreditCardAccount,
  getCreditCardBillingDates,
} from '@/utils/creditCardUtils';
import {
  format,
  getISOWeek,
  getYear,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  eachYearOfInterval,
  addMonths,
  getDate,
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
  accountInstance: AccountType,
  type: string,
  amount: number
) => {
  if (type === RootType.INCOME) {
    accountInstance.balance = Number(accountInstance.balance) + Number(amount);
  } else if (type === RootType.EXPENSE) {
    accountInstance.balance = Number(accountInstance.balance) - Number(amount);
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
  }
) => {
  const transaction = await sequelize.transaction();

  try {
    const account = await Account.findByPk(data.accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    // Handle Installment Plan
    if (data.installment && data.installment.totalInstallments > 1) {
      // 1. Create InstallmentPlan record
      const installmentPlan = await InstallmentPlan.create(
        {
          userId: data.userId,
          totalAmount: data.amount,
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

      // 2. Calculate monthly amount
      const totalAmount = data.amount;
      const count = data.installment.totalInstallments;
      let monthlyAmount = totalAmount / count;

      // Apply rounding logic
      // Note: We should probably store the high-precision monthly amount or handle remainders explicitly.
      // For now, let's implement basic logic based on calculationMethod
      if (
        data.installment.calculationMethod === CalculationMethod.FLOOR ||
        data.installment.calculationMethod === CalculationMethod.CEIL ||
        data.installment.calculationMethod === CalculationMethod.ROUND
      ) {
        // Javascript default division is floating point.
        // If we want to strictly follow FLOOR/CEIL/ROUND for integer-like currency handling:
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

      // 3. Handle remainder
      // Calculate strict total of these monthly amounts
      const calculatedTotal = monthlyAmount * count;
      let remainder = totalAmount - calculatedTotal;

      // Distribute remainder based on placement perference

      const firstInstallmentAmount =
        data.installment.remainderPlacement === RemainderPlacement.FIRST
          ? monthlyAmount + remainder
          : monthlyAmount;

      const lastInstallmentAmount =
        data.installment.remainderPlacement === RemainderPlacement.LAST
          ? monthlyAmount + remainder
          : monthlyAmount;

      const middleInstallmentAmount = monthlyAmount;

      // 4. Generate Transactions for each installment
      // Determine billing dates if credit card
      let billingDate = getDate(new Date(data.date)); // Default to transaction date
      if (await isCreditCardAccount(data.accountId)) {
        const dates = await getCreditCardBillingDates(
          data.accountId,
          new Date(data.date)
        );
        // Usually installments start billing on next statement or current, dependent on bank logic.
        // For simplicity, let's assume it follows standard billing cycle logic.
        // We might just use the transaction date as the "purchase date" and let the credit card logic handle billing cycle placement.
        // BUT strict installment plans often fix the "billed date" for each month.
        // Let's just create transactions spaced by 1 month for now.
      }

      for (let i = 1; i <= count; i++) {
        let amount = middleInstallmentAmount;
        if (i === 1) amount = firstInstallmentAmount;
        if (i === count) amount = lastInstallmentAmount;

        const date = addMonths(new Date(data.date), i - 1);

        await Transaction.create(
          {
            ...data,
            id: undefined, // Create new ID
            amount: amount,
            description: getInstallmentDescription(
              data.description || '',
              i,
              count
            ),
            date: format(date, 'yyyy-MM-dd'),
            installmentPlanId: installmentPlan.id,
          },
          { transaction }
        );
      }
    } else {
      // Normal transaction
      await Transaction.create(data, { transaction });
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const updateIncomeExpense = async (
  id: string,
  data: UpdateTransactionSchema,
  userId: string
) => {
  return simplifyTransaction(async (t) => {
    const transaction = await Transaction.findOne({
      where: { id, userId },
      transaction: t,
    });
    if (!transaction) throw new Error('Transaction not found');

    const oldAccount = await Account.findOne({
      where: { id: transaction.accountId!, userId },
      transaction: t,
    });
    if (!oldAccount) throw new Error('Old account not found');

    const revertType =
      transaction.type === RootType.INCOME ? RootType.EXPENSE : RootType.INCOME;
    await calcAccountBalance(
      oldAccount,
      revertType,
      Number(transaction.amount)
    );
    await oldAccount.save({ transaction: t });

    let newAccount = oldAccount;
    if (data.accountId !== transaction.accountId) {
      const account = await Account.findOne({
        where: { id: data.accountId, userId },
        transaction: t,
      });
      if (!account) throw new Error('New account not found');
      newAccount = account;
    }

    await calcAccountBalance(newAccount, data.type, data.amount);
    await newAccount.save({ transaction: t });

    await transaction.update(data, { transaction: t });

    return transaction.toJSON();
  });
};

const deleteTransaction = async (id: string, userId: string) => {
  return simplifyTransaction(async (t) => {
    const transaction = await Transaction.findOne({
      where: { id, userId },
      transaction: t,
    });
    if (!transaction) throw new Error('Transaction not found');

    const account = await Account.findOne({
      where: { id: transaction.accountId, userId },
      transaction: t,
    });
    if (!account) throw new Error('Account not found');

    const revertType =
      transaction.type === RootType.INCOME ? RootType.EXPENSE : RootType.INCOME;
    await calcAccountBalance(account, revertType, Number(transaction.amount));
    await account.save({ transaction: t });

    if (transaction.linkId) {
      const linkedTransaction = await Transaction.findOne({
        where: { id: transaction.linkId, userId },
        transaction: t,
      });

      if (linkedTransaction) {
        const linkedAccount = await Account.findOne({
          where: { id: linkedTransaction.accountId, userId },
          transaction: t,
        });

        if (linkedAccount) {
          const linkedRevertType =
            linkedTransaction.type === RootType.INCOME
              ? RootType.EXPENSE
              : RootType.INCOME;
          await calcAccountBalance(
            linkedAccount,
            linkedRevertType,
            Number(linkedTransaction.amount)
          );
          await linkedAccount.save({ transaction: t });
        }

        await linkedTransaction.destroy({ transaction: t });
      }
    }

    await transaction.destroy({ transaction: t });

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

    const fromData = {
      ...data,
      type: RootType.EXPENSE,
      billingDate: data.date, // Transfer default billing date = date
    };

    const toData = {
      ...data,
      targetAccountId: data.accountId,
      accountId: data.targetAccountId,
      type: RootType.INCOME,
      billingDate: data.date,
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

    await calcAccountBalance(fromAccount, fromData.type, fromData.amount);
    await calcAccountBalance(toAccount, toData.type, toData.amount);

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
      fromTransaction: fromTransaction.toJSON(),
      toTransaction: toTransaction.toJSON(),
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
