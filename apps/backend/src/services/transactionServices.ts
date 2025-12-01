import {
  CreateTransactionSchema,
  GetTransactionsByDateSchema,
  MainType,
  TransactionType,
} from '@repo/shared';
import { simplifyTransaction } from '@/utils/common';
import Transaction from '@/models/transaction';
import Account from '@/models/account';

const createTransaction = async (data: CreateTransactionSchema) => {
  return await simplifyTransaction(async (t) => {
    const transaction = await Transaction.create(data, { transaction: t });
    const account = await Account.findByPk(data.accountId, { transaction: t });
    if (!account) throw new Error('Account not found');

    if (data.type === MainType.INCOME) {
      account.balance = Number(account.balance) + Number(data.amount);
    } else {
      account.balance = Number(account.balance) - Number(data.amount);
    }

    await account.save({ transaction: t });

    return transaction;
  });
};

const getTransactionsByDate = async (
  data: GetTransactionsByDateSchema,
  date: string
) => {
  const instance = await Transaction.findAll({
    where: {
      ...data,
      date,
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

export default {
  createTransaction,
  getTransactionsByDate,
};
