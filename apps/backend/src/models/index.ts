import Account from './account';
import Category from './category';
import Transaction from './transaction';
import TransactionExtra from './TransactionExtra';
import User from './user';
import CreditCardDetail from './CreditCardDetail';
import InstallmentPlan from './InstallmentPlan';
import Announcement from './announcement';
import PersonnelNotification from './personnel_notification';

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
};