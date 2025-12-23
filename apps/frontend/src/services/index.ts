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
import {
  getOverviewTrend,
  getOverviewTop3Categories,
  getOverviewTop3Expenses,
  getDetailTabData,
  getCategoryTabData,
  getRankingTabData,
} from './statistics';

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
  getOverviewTrend,
  getOverviewTop3Categories,
  getOverviewTop3Expenses,
  getDetailTabData,
  getCategoryTabData,
  getRankingTabData,
};
