import { getCategories } from './category';
import {
  getPersonnelAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
} from './personnelAccount';
import {
  getTransactions,
  addTransaction,
  addTransfer,
  getTransactionsSummary,
} from './transaction';

export default {
  getCategories,
  getPersonnelAccounts,
  getTransactions,
  createAccount,
  updateAccount,
  deleteAccount,
  addTransaction,
  addTransfer,
  getTransactionsSummary,
};
