import Account from './account';
import Category from './category';
import Transaction from './transaction';
import TransactionExtra from './TransactionExtra';
import User from './user';
import CreditCardDetail from './CreditCardDetail';
import InstallmentPlan from './InstallmentPlan';
import Announcement from './announcement';
import PersonnelNotification from './personnel_notification';
import Budget from './budget';
import BudgetCategory from './budgetCategory';
import TransactionBudget from './transactionBudget';
import BudgetPeriodSnapshot from './budgetPeriodSnapshot';
import MerchantMapping from './MerchantMapping';
import PendingTransaction from './PendingTransaction';
import BillParseTelemetry from './BillParseTelemetry';
import RecurringTemplate from './RecurringTemplate';
import PasswordResetToken from './PasswordResetToken';
import Currency from './currency';
import ExchangeRate from './exchangeRate';

// -----------------------------------------------------------------------------
// Soft Delete Hooks (Cascade)
// -----------------------------------------------------------------------------

User.addHook('afterDestroy', async (user: any, options: any) => {
  const transaction = options.transaction;
  const userId = user.id;

  // 先刪除 Transaction（底層依賴），帶 individualHooks 以觸發 TransactionExtra/linkId 清理
  await Transaction.destroy({
    where: { userId },
    transaction,
    individualHooks: true,
  });
  await Account.destroy({
    where: { userId },
    transaction,
    individualHooks: true,
  });
  await Budget.destroy({
    where: { userId },
    transaction,
    individualHooks: true,
  });
  await Category.destroy({
    where: { userId },
    transaction,
    individualHooks: true,
  });
  await PersonnelNotification.destroy({ where: { userId }, transaction });
  await InstallmentPlan.destroy({ where: { userId }, transaction });
  await RecurringTemplate.destroy({ where: { userId }, transaction });
});

Transaction.addHook('afterDestroy', async (instance: any, options: any) => {
  const transaction = options.transaction;
  if (instance.transactionExtraId) {
    await TransactionExtra.destroy({
      where: { id: instance.transactionExtraId },
      transaction,
    });
  }
  if (instance.linkId) {
    const linked = await Transaction.findByPk(instance.linkId, { transaction });
    if (linked) {
      await Transaction.destroy({
        where: { id: instance.linkId },
        transaction,
      });
    }
  }
});

// -----------------------------------------------------------------------------
// Define Associations
// -----------------------------------------------------------------------------

// User & Category
User.hasMany(Category, { foreignKey: 'userId', as: 'categories' });
Category.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User & Account
User.hasMany(Account, { foreignKey: 'userId', as: 'accounts' });
Account.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User & Transaction
User.hasMany(Transaction, { foreignKey: 'userId', as: 'transactions' });
Transaction.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User & InstallmentPlan
User.hasMany(InstallmentPlan, { foreignKey: 'userId', as: 'installmentPlans' });
InstallmentPlan.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User & PersonnelNotification
User.hasOne(PersonnelNotification, {
  foreignKey: 'userId',
  as: 'personnelNotification',
});
PersonnelNotification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User & Budget
User.hasMany(Budget, { foreignKey: 'userId', as: 'budgets' });
Budget.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Account & CreditCardDetail
Account.hasOne(CreditCardDetail, {
  foreignKey: 'accountId',
  as: 'credit_card_detail',
});
CreditCardDetail.belongsTo(Account, { foreignKey: 'accountId', as: 'account' });

// Account & Transaction
Account.hasMany(Transaction, { foreignKey: 'accountId', as: 'transactions' });
Transaction.belongsTo(Account, { foreignKey: 'accountId', as: 'account' });

// Category self-referential (parent/children)
Category.hasMany(Category, { as: 'children', foreignKey: 'parentId' });
Category.belongsTo(Category, { as: 'parent', foreignKey: 'parentId' });

// Category & Transaction
Category.hasMany(Transaction, { foreignKey: 'categoryId', as: 'transactions' });
Transaction.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

// Category & BudgetCategory
Category.hasMany(BudgetCategory, {
  foreignKey: 'categoryId',
  as: 'budgetCategories',
});
BudgetCategory.belongsTo(Category, {
  foreignKey: 'categoryId',
  as: 'category',
});

// Transaction & TransactionExtra
Transaction.belongsTo(TransactionExtra, {
  foreignKey: 'transactionExtraId',
  as: 'transactionExtra',
});
TransactionExtra.hasOne(Transaction, {
  foreignKey: 'transactionExtraId',
  as: 'transaction',
});

// Transaction self-referential (transfer link)
Transaction.belongsTo(Transaction, { as: 'target', foreignKey: 'linkId' });

// Transaction & targetAccount (for transfers)
Transaction.belongsTo(Account, {
  as: 'targetAccount',
  foreignKey: 'targetAccountId',
});

// InstallmentPlan & Transaction
InstallmentPlan.hasMany(Transaction, {
  foreignKey: 'installmentPlanId',
  as: 'transactions',
});
Transaction.belongsTo(InstallmentPlan, {
  foreignKey: 'installmentPlanId',
  as: 'installmentPlan',
});

// Transaction & TransactionBudget
Transaction.hasMany(TransactionBudget, {
  foreignKey: 'transactionId',
  as: 'transactionBudgets',
});
TransactionBudget.belongsTo(Transaction, {
  foreignKey: 'transactionId',
  as: 'transaction',
});

// Budget & BudgetCategory
Budget.hasMany(BudgetCategory, {
  foreignKey: 'budgetId',
  as: 'budgetCategories',
});
BudgetCategory.belongsTo(Budget, { foreignKey: 'budgetId', as: 'budget' });

// Budget & TransactionBudget
Budget.hasMany(TransactionBudget, {
  foreignKey: 'budgetId',
  as: 'transactionBudgets',
});
TransactionBudget.belongsTo(Budget, { foreignKey: 'budgetId', as: 'budget' });

// Budget & BudgetPeriodSnapshot
Budget.hasMany(BudgetPeriodSnapshot, {
  foreignKey: 'budgetId',
  as: 'snapshots',
});
BudgetPeriodSnapshot.belongsTo(Budget, {
  foreignKey: 'budgetId',
  as: 'budget',
});

// Many-to-Many via TransactionBudget
Budget.belongsToMany(Transaction, {
  through: TransactionBudget,
  as: 'transactions',
  foreignKey: 'budgetId',
});
Transaction.belongsToMany(Budget, {
  through: TransactionBudget,
  as: 'budgets',
  foreignKey: 'transactionId',
});

// MerchantMapping & Category
Category.hasMany(MerchantMapping, {
  foreignKey: 'categoryId',
  as: 'merchantMappings',
});
MerchantMapping.belongsTo(Category, {
  foreignKey: 'categoryId',
  as: 'category',
});

// PendingTransaction & User
User.hasMany(PendingTransaction, {
  foreignKey: 'userId',
  as: 'pendingTransactions',
});
PendingTransaction.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// PendingTransaction & Category (suggested)
Category.hasMany(PendingTransaction, {
  foreignKey: 'suggestedCategoryId',
  as: 'suggestedPendingTransactions',
});
PendingTransaction.belongsTo(Category, {
  foreignKey: 'suggestedCategoryId',
  as: 'suggestedCategory',
});

// PendingTransaction & Transaction (matched installment)
Transaction.hasOne(PendingTransaction, {
  foreignKey: 'matchedTransactionId',
  as: 'matchedPendingTransaction',
});
PendingTransaction.belongsTo(Transaction, {
  foreignKey: 'matchedTransactionId',
  as: 'matchedTransaction',
});

// User & RecurringTemplate
User.hasMany(RecurringTemplate, {
  foreignKey: 'userId',
  as: 'recurringTemplates',
});
RecurringTemplate.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// RecurringTemplate & Transaction
RecurringTemplate.hasMany(Transaction, {
  foreignKey: 'recurringTemplateId',
  as: 'transactions',
});
Transaction.belongsTo(RecurringTemplate, {
  foreignKey: 'recurringTemplateId',
  as: 'recurringTemplate',
});

// User & PasswordResetToken
User.hasMany(PasswordResetToken, {
  foreignKey: 'userId',
  as: 'passwordResetTokens',
});
PasswordResetToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// -----------------------------------------------------------------------------
// Currency / ExchangeRate（共用維度表）
// ⚠️ 刻意不加入任何 User.afterDestroy cascade：刪 User 不可波及共用幣別/匯率表。
//    FK 一律 RESTRICT 再加一層保護。
// -----------------------------------------------------------------------------

// Account / User → Currency（計價幣別 / 本位幣）
Currency.hasMany(Account, { foreignKey: 'currencyCode', as: 'accounts' });
Account.belongsTo(Currency, { foreignKey: 'currencyCode', as: 'currency' });
Currency.hasMany(User, { foreignKey: 'baseCurrencyCode', as: 'baseUsers' });
User.belongsTo(Currency, { foreignKey: 'baseCurrencyCode', as: 'baseCurrency' });

// ExchangeRate → Currency（base / quote）
Currency.hasMany(ExchangeRate, { foreignKey: 'baseCode', as: 'baseRates' });
ExchangeRate.belongsTo(Currency, { foreignKey: 'baseCode', as: 'baseCurrency' });
Currency.hasMany(ExchangeRate, { foreignKey: 'quoteCode', as: 'quoteRates' });
ExchangeRate.belongsTo(Currency, {
  foreignKey: 'quoteCode',
  as: 'quoteCurrency',
});

// Export everything
export {
  Account,
  Category,
  Transaction,
  TransactionExtra,
  User,
  CreditCardDetail,
  InstallmentPlan,
  Announcement,
  PersonnelNotification,
  Budget,
  BudgetCategory,
  TransactionBudget,
  BudgetPeriodSnapshot,
  MerchantMapping,
  PendingTransaction,
  BillParseTelemetry,
  RecurringTemplate,
  PasswordResetToken,
  Currency,
  ExchangeRate,
};
