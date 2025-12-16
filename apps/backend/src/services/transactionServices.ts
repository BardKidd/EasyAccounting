import {
  CreateTransactionSchema,
  GetTransactionsByDateSchema,
  MainType,
  TransactionType,
  UpdateTransactionSchema,
  AccountType,
  CreateTransferSchema,
  TransactionTypeWhenOperate,
  GetTransactionsDashboardSummarySchema,
  PeriodType,
} from '@repo/shared';
import { simplifyTransaction } from '@/utils/common';
import Transaction from '@/models/transaction';
import Account from '@/models/account';
import { Op } from 'sequelize';
import {
  format,
  getISOWeek,
  getYear,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  eachYearOfInterval,
} from 'date-fns';

const getTransactionsByDate = async (
  query: GetTransactionsByDateSchema,
  userId: string
) => {
  const { startDate, endDate, page = 1, ...otherFilters } = query;
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

  const { rows, count } = await Transaction.findAndCountAll({
    where: {
      ...otherFilters,
      ...dateFilter,
      userId,
      [Op.or]: [
        { linkId: null as any }, // 一般收支
        { type: { [Op.ne]: MainType.INCOME } }, // 操作的主動方
      ],
    },
    limit: Number(limit),
    offset, // 定義從第幾筆開始取資料，e.g. page=2, limit=10,offset=10
    order: [
      ['date', 'DESC'],
      ['time', 'DESC'],
    ],
    attributes: {
      exclude: ['createdAt', 'updatedAt', 'deletedAt', 'linkId'], // 排除不需要的欄位
    },
    raw: true,
  });

  return {
    items: rows as unknown as TransactionType[],
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / Number(limit)), // 無條件進位
    },
  };
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
    raw: true, // 直接回傳資料，可以不用再 .toJSON()
    // Pick<TransactionType, ...>: TS 工具型別，表示從 TransactionType 中「只選取」這三個欄位，其他的屬性都會被排除
  })) as unknown as Pick<TransactionType, 'amount' | 'date' | 'type'>[];

  const start = new Date(startDate);
  const end = new Date(endDate);

  // Generate generic buckets
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
    // ISO Week
    const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
    buckets = weeks.map((d) => {
      const year = getYear(d);
      const week = getISOWeek(d);
      return {
        type: PeriodType.WEEK,
        date: `${year}-W${String(week).padStart(2, '0')}`, // 沒有兩位數就自動補 0
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

  // Calculate summary
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
      if (t.type === MainType.INCOME) {
        const val = Number(t.amount);
        bucket.income += val;
        summary.income += val;
      } else if (t.type === MainType.EXPENSE) {
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
    result = instance.toJSON();
    const { id, ...other } = result;
    return other;
  }

  return result;
};

const calcAccountBalance = async (
  accountInstance: AccountType,
  type: string,
  amount: number
) => {
  if (type === MainType.INCOME) {
    accountInstance.balance = Number(accountInstance.balance) + Number(amount);
  } else if (type === MainType.EXPENSE) {
    accountInstance.balance = Number(accountInstance.balance) - Number(amount);
  }
};

const createTransaction = async (
  data: CreateTransactionSchema,
  userId: string
) => {
  return await simplifyTransaction(async (t) => {
    const transaction = await Transaction.create(
      { ...data, userId },
      { transaction: t }
    );

    const account = await Account.findOne({
      where: { id: data.accountId, userId },
      transaction: t,
    });
    if (!account) throw new Error('Account not found');

    calcAccountBalance(account, data.type, data.amount);

    await account.save({ transaction: t });

    return transaction.toJSON();
  });
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

    // 1. 在做改變前先恢復成該筆交易前的狀態再做處理，否則直接改的話會有正負差問題。
    const oldAccount = await Account.findOne({
      where: { id: transaction.accountId, userId },
      transaction: t,
    });
    if (!oldAccount) throw new Error('Old account not found');

    // 所以這裡才要反過來
    const revertType =
      transaction.type === MainType.INCOME ? MainType.EXPENSE : MainType.INCOME;
    await calcAccountBalance(
      oldAccount,
      revertType,
      Number(transaction.amount)
    );
    await oldAccount.save({ transaction: t });

    // 2. 之後就按照正常邏輯進行計算
    let newAccount = oldAccount;
    // 不過還是先看看有沒有換帳戶(e.g. 原本紀錄錢包支出，記錯了改成銀行帳戶)
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

    // 3. 更新資料
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

    // 跟編輯一樣需要先去還原該筆交易前的狀態再做處理，否則直接改的話會有正負差問題。
    const account = await Account.findOne({
      where: { id: transaction.accountId, userId },
      transaction: t,
    });
    if (!account) throw new Error('Account not found');

    const revertType =
      transaction.type === MainType.INCOME ? MainType.EXPENSE : MainType.INCOME;
    await calcAccountBalance(account, revertType, Number(transaction.amount));
    await account.save({ transaction: t });

    await transaction.destroy({ transaction: t });

    return transaction.toJSON();
  });
};

// 只要流程是 A -> B 帳戶，且流程是 A 為主動減少，B 為被動增加的流程就適合
const createTransfer = async (
  data: CreateTransferSchema,
  userId: string
): Promise<{
  fromTransaction: TransactionTypeWhenOperate;
  toTransaction: TransactionTypeWhenOperate;
}> => {
  return simplifyTransaction(async (t) => {
    if (data.type !== MainType.OPERATE) throw new Error('Must be operate type');

    const fromData = {
      ...data,
      type: MainType.EXPENSE,
    };

    const toData = {
      ...data,
      targetAccountId: data.accountId,
      accountId: data.targetAccountId,
      type: MainType.INCOME,
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
