import { CreateTransactionSchema, MainType } from '@repo/shared';
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

export default {
  createTransaction,
};
