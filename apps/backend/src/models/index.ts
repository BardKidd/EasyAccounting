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

// -----------------------------------------------------------------------------
// Define Associations
// -----------------------------------------------------------------------------

// Transaction & TransactionExtra
Transaction.belongsTo(TransactionExtra, {
  foreignKey: 'transactionExtraId',
  as: 'transactionExtra',
});
TransactionExtra.hasOne(Transaction, {
  foreignKey: 'transactionExtraId',
  as: 'transaction',
});

// User & Account
User.hasMany(Account, { foreignKey: 'userId', as: 'accounts' });
Account.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User & Transaction
User.hasMany(Transaction, { foreignKey: 'userId', as: 'transactions' });
Transaction.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Account & Transaction
Account.hasMany(Transaction, { foreignKey: 'accountId', as: 'transactions' });
Transaction.belongsTo(Account, { foreignKey: 'accountId', as: 'account' });

// Category & Transaction
Category.hasMany(Transaction, { foreignKey: 'categoryId', as: 'transactions' });
Transaction.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

// InstallmentPlan & Transaction
InstallmentPlan.hasMany(Transaction, { foreignKey: 'installmentPlanId', as: 'transactions' });
Transaction.belongsTo(InstallmentPlan, { foreignKey: 'installmentPlanId', as: 'installmentPlan' });

// User & Budget
User.hasMany(Budget, { foreignKey: 'userId', as: 'budgets' });
Budget.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Budget & BudgetCategory
Budget.hasMany(BudgetCategory, { foreignKey: 'budgetId', as: 'budgetCategories' });
BudgetCategory.belongsTo(Budget, { foreignKey: 'budgetId', as: 'budget' });

// Category & BudgetCategory
Category.hasMany(BudgetCategory, { foreignKey: 'categoryId', as: 'budgetCategories' });
BudgetCategory.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

// Budget & TransactionBudget
Budget.hasMany(TransactionBudget, { foreignKey: 'budgetId', as: 'transactionBudgets' });
TransactionBudget.belongsTo(Budget, { foreignKey: 'budgetId', as: 'budget' });

// Transaction & TransactionBudget
Transaction.hasMany(TransactionBudget, { foreignKey: 'transactionId', as: 'transactionBudgets' });
TransactionBudget.belongsTo(Transaction, { foreignKey: 'transactionId', as: 'transaction' });

// Budget & BudgetPeriodSnapshot
Budget.hasMany(BudgetPeriodSnapshot, { foreignKey: 'budgetId', as: 'snapshots' });
BudgetPeriodSnapshot.belongsTo(Budget, { foreignKey: 'budgetId', as: 'budget' });

// Many-to-Many via TransactionBudget
Budget.belongsToMany(Transaction, { through: TransactionBudget, as: 'transactions', foreignKey: 'budgetId' });
Transaction.belongsToMany(Budget, { through: TransactionBudget, as: 'budgets', foreignKey: 'transactionId' });

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
};