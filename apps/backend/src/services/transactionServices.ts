import {
  CreateTransactionSchema,
  GetTransactionsByDateSchema,
  MainType,
  TransactionType,
  UpdateTransactionSchema,
  AccountType,
} from '@repo/shared';
import { simplifyTransaction } from '@/utils/common';
import Transaction from '@/models/transaction';
import Account from '@/models/account';

const calcAccountBalance = async (
  accountInstance: AccountType,
  type: string,
  amount: number
) => {
  if (type === MainType.INCOME) {
    accountInstance.balance = Number(accountInstance.balance) + Number(amount);
  } else {
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

    return transaction;
  });
};

const getTransactionsByDate = async (
  data: GetTransactionsByDateSchema,
  date: string,
  userId: string
) => {
  const instance = await Transaction.findAll({
    where: {
      ...data,
      date,
      userId,
    },
  });
  let result: TransactionType[] = [];

  if (instance.length > 0) {
    result = instance.map((item) => {
      item = item.toJSON();
      const { id, createdAt, updatedAt, deletedAt, ...other } = item;
      return other;
    });
  }

  return result;
};

const getTransactionById = async (id: string, userId: string) => {
  const instance = await Transaction.findOne({
    where: { id, userId },
  });
  let result: TransactionType | null = null;

  if (instance) {
    result = instance.toJSON();
    const { id, createdAt, updatedAt, deletedAt, ...other } = result;
    return other;
  }

  return result;
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

    return transaction;
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

    return transaction;
  });
};

export default {
  createTransaction,
  getTransactionsByDate,
  getTransactionById,
  updateIncomeExpense,
  deleteTransaction,
};
