import Account from './account';
import Category from './category';
import Transaction from './transaction';
import TransactionExtra from './TransactionExtra';
import User from './user';
import CreditCardDetail from './CreditCardDetail';
import InstallmentPlan from './InstallmentPlan';
import Announcement from './announcement';
import PersonnelNotification from './personnel_notification';
import MerchantMapping from './MerchantMapping';
import PendingTransaction from './PendingTransaction';
import BillParseTelemetry from './BillParseTelemetry';
import RecurringTemplate from './RecurringTemplate';
import PasswordResetToken from './PasswordResetToken';
import Currency from './currency';
import ExchangeRate from './exchangeRate';
import BudgetAssignment from './budgetAssignment';
import BudgetTarget from './budgetTarget';
import Tag from './tag';
import TransactionTag from './transactionTag';
import TransactionSplit from './transactionSplit';

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
  await Category.destroy({
    where: { userId },
    transaction,
    individualHooks: true,
  });
  await PersonnelNotification.destroy({ where: { userId }, transaction });
  await InstallmentPlan.destroy({ where: { userId }, transaction });
  await RecurringTemplate.destroy({ where: { userId }, transaction });
  await BudgetAssignment.destroy({ where: { userId }, transaction });
  await BudgetTarget.destroy({ where: { userId }, transaction });
  // Tag（hard-delete）：individualHooks 讓 Tag.afterDestroy 清各自的 transaction_tag。
  // 須在 Transaction 之後即可（transaction_tag 已隨 Transaction.afterDestroy 清過，
  // 這裡再清一次無妨——刪 tag 本身與其殘留關聯）。
  await Tag.destroy({ where: { userId }, transaction, individualHooks: true });
  // MerchantMapping（per-user、hard-delete）：刪 User 連帶清其學到的商家→分類對應。
  await MerchantMapping.destroy({ where: { userId }, transaction });
});

// Category 為 soft-delete（paranoid:true）：DB 層的 ON DELETE CASCADE 不會觸發，
// 故在此 hook 串接原本靠 FK CASCADE 處理的連帶刪除。
Category.addHook('afterDestroy', async (category: any, options: any) => {
  const transaction = options.transaction;
  // (1) 串接 soft-delete 子分類（維持「刪父分類連帶刪整棵子樹」語意）；
  //     individualHooks 讓每個子分類也走此 hook 清自己的 assignment。
  await Category.destroy({
    where: { parentId: category.id },
    transaction,
    individualHooks: true,
  });
  // (2) 硬刪 budget_assignment（模型 paranoid:false），RTA 自動回升（spec §3.2）。
  await BudgetAssignment.destroy({
    where: { categoryId: category.id },
    transaction,
  });
  // (3) 硬刪 budget_target（信封消失，target 一併移除）。
  await BudgetTarget.destroy({
    where: { categoryId: category.id },
    transaction,
  });
});

// Account 為 soft-delete（paranoid）：DB 層的 ON DELETE CASCADE 不會觸發，
// 故在此 hook 硬刪該卡的 CC Payment assignment（Phase 2 ④）——RTA 自動回升，
// 卡債歷史仍由交易保留（同 closed account 語意）。
Account.addHook('afterDestroy', async (account: any, options: any) => {
  const transaction = options.transaction;
  await BudgetAssignment.destroy({
    where: { creditAccountId: account.id },
    transaction,
  });
});

Transaction.addHook('afterDestroy', async (instance: any, options: any) => {
  const transaction = options.transaction;
  // 交易（含 soft-delete）→ 清掉其標籤關聯與拆分子項（皆無 soft-delete）。
  await TransactionTag.destroy({
    where: { transactionId: instance.id },
    transaction,
  });
  await TransactionSplit.destroy({
    where: { transactionId: instance.id },
    transaction,
  });
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

// Tag（hard-delete）：刪 tag 串接清 transaction_tag（交易本身不動）。
Tag.addHook('afterDestroy', async (tag: any, options: any) => {
  const transaction = options.transaction;
  await TransactionTag.destroy({
    where: { tagId: tag.id },
    transaction,
  });
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

// BudgetAssignment & User
User.hasMany(BudgetAssignment, {
  foreignKey: 'userId',
  as: 'budgetAssignments',
});
BudgetAssignment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// BudgetAssignment & Category
Category.hasMany(BudgetAssignment, {
  foreignKey: 'categoryId',
  as: 'budgetAssignments',
});
BudgetAssignment.belongsTo(Category, {
  foreignKey: 'categoryId',
  as: 'category',
});

// BudgetTarget & User / Category
User.hasMany(BudgetTarget, { foreignKey: 'userId', as: 'budgetTargets' });
BudgetTarget.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Category.hasMany(BudgetTarget, {
  foreignKey: 'categoryId',
  as: 'budgetTargets',
});
BudgetTarget.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

// -----------------------------------------------------------------------------
// Tags（拆分交易+標籤 Phase A）
// -----------------------------------------------------------------------------

// User & Tag
User.hasMany(Tag, { foreignKey: 'userId', as: 'tags' });
Tag.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Transaction ⇄ Tag（多對多，through transaction_tag）
Transaction.belongsToMany(Tag, {
  through: TransactionTag,
  foreignKey: 'transactionId',
  otherKey: 'tagId',
  as: 'tags',
});
Tag.belongsToMany(Transaction, {
  through: TransactionTag,
  foreignKey: 'tagId',
  otherKey: 'transactionId',
  as: 'transactions',
});

// 中介表直接關聯（供「另撈一次再貼回」避免分頁 row 複製，spec §7）
TransactionTag.belongsTo(Tag, { foreignKey: 'tagId', as: 'tag' });
TransactionTag.belongsTo(Transaction, {
  foreignKey: 'transactionId',
  as: 'transaction',
});

// -----------------------------------------------------------------------------
// 拆分交易（Phase B）：Transaction 1—N TransactionSplit
// -----------------------------------------------------------------------------
Transaction.hasMany(TransactionSplit, {
  foreignKey: 'transactionId',
  as: 'splits',
});
TransactionSplit.belongsTo(Transaction, {
  foreignKey: 'transactionId',
  as: 'transaction',
});
Category.hasMany(TransactionSplit, {
  foreignKey: 'categoryId',
  as: 'transactionSplits',
});
TransactionSplit.belongsTo(Category, {
  foreignKey: 'categoryId',
  as: 'category',
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
  MerchantMapping,
  PendingTransaction,
  BillParseTelemetry,
  RecurringTemplate,
  PasswordResetToken,
  Currency,
  ExchangeRate,
  BudgetAssignment,
  BudgetTarget,
  Tag,
  TransactionTag,
  TransactionSplit,
};
