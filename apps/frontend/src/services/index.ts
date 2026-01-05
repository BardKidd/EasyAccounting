import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from './category';
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
  getAccountTabData,
  getAssetTrend,
} from './statistics';
import {
  getPersonnelNotification,
  updatePersonnelNotification,
} from './personnelNotification';
import {
  getTransactionTemplateUrl,
  getTransactionsExcelUrl,
} from './importExport';

export default {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
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
  getAccountTabData,
  getPersonnelNotification,
  updatePersonnelNotification,
  getTransactionTemplateUrl,
  getTransactionsExcelUrl,
  getAssetTrend,
};
