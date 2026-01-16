import express from 'express';
import path from 'path';
import cors from 'cors';
import sequelize from '@/utils/postgres';
import mongoConnection from '@/utils/mongodb';
import { loggerMiddleware } from '@/middlewares/loggerMiddleware';

import User from '@/models/user';
import Category from '@/models/category';
import Account from '@/models/account';
import Transaction from '@/models/transaction';
import TransactionExtra from '@/models/TransactionExtra';
import PersonnelNotification from '@/models/personnel_notification';
import CreditCardDetail from '@/models/CreditCardDetail';
import InstallmentPlan from '@/models/InstallmentPlan';

import userRoute from '@/routes/userRoute';
import categoryRoute from '@/routes/categoryRoute';
import announcementRoute from '@/routes/announcementRoute';
import accountRoute from '@/routes/accountRoute';
import transactionRoute from '@/routes/transactionRoute';
import authRoute from '@/routes/authRoute';
import cookieParser from 'cookie-parser';
import statisticsRoute from '@/routes/statisticsRoute';
import deployHealthRoute from '@/routes/deployHealthRoute';
import personnelNotificationRoute from '@/routes/personnelNotificationRoute';
import excelRoute from '@/routes/excelRoute';
import reconciliationRoute from '@/routes/reconciliationRoute';
import {
  startDailyReminderCronJobs,
  startMonthlyAnalysisNoticeCronJobs,
  startWeeklySummaryNoticeCronJobs,
} from './cron/notificationCron';
import basicAuth from 'express-basic-auth';

const app: express.Application = express();

// CORS 設定
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigin = process.env.ORIGIN_URL;

      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigin && origin === allowedOrigin) {
        callback(null, true);
      } else {
        console.log(
          `[CORS BLOCK] Origin: '${origin}', Allowed: '${allowedOrigin}'`
        );
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(loggerMiddleware);

app.use('/api', categoryRoute);
app.use('/api', userRoute);
app.use('/api', announcementRoute);
app.use('/api', accountRoute);
app.use('/api', transactionRoute);
app.use('/api', authRoute);
app.use('/api', statisticsRoute);
app.use('/api', personnelNotificationRoute);
app.use('/api', excelRoute);
app.use('/api', reconciliationRoute);
app.use('/api', deployHealthRoute);
// 透過 Hook 實作軟刪除的 Cascade (Sequelize 的 hooks: true 只有再某些版本有效，手寫最穩)
User.addHook('afterDestroy', async (user: any, options: any) => {
  const transaction = options.transaction;
  const userId = user.id;

  // 1. 刪除相關 Account
  await Account.destroy({ where: { userId }, transaction, individualHooks: true });
  // 2. 刪除相關 Transaction
  await Transaction.destroy({ where: { userId }, transaction, individualHooks: true });
  // 3. 刪除相關 Notification
  await PersonnelNotification.destroy({ where: { userId }, transaction });
  // 4. 刪除相關 InstallmentPlan
  await InstallmentPlan.destroy({ where: { userId }, transaction });
});

Transaction.addHook('afterDestroy', async (instance: any, options: any) => {
  const transaction = options.transaction;
  // 1. Cascade delete TransactionExtra
  if (instance.transactionExtraId) {
    await TransactionExtra.destroy({
      where: { id: instance.transactionExtraId },
      transaction,
    });
  }
  // 2. Cascade delete linked transaction (for transfers)
  if (instance.linkId) {
    // 避免無限迴圈：只在另一邊還沒被刪除時才發動
    const linked = await Transaction.findByPk(instance.linkId, { transaction });
    if (linked) {
      await Transaction.destroy({
        where: { id: instance.linkId },
        transaction,
      });
    }
  }
});

User.hasMany(Category);
User.hasMany(Account);
User.hasMany(Transaction);
User.hasMany(InstallmentPlan);
Category.belongsTo(User);
Account.belongsTo(User);
Transaction.belongsTo(User);
InstallmentPlan.belongsTo(User);

User.hasOne(PersonnelNotification);
PersonnelNotification.belongsTo(User);

// Account & CreditCardDetail
Account.hasOne(CreditCardDetail, {
  as: 'credit_card_detail',
  foreignKey: 'accountId',
});
CreditCardDetail.belongsTo(Account);

// InstallmentPlan & Transaction
InstallmentPlan.hasMany(Transaction);
Transaction.belongsTo(InstallmentPlan);
Transaction.belongsTo(TransactionExtra);
TransactionExtra.hasOne(Transaction);

// 可以使用 Magic 方法，加上 include 可以自動建立 children 和 parent 屬性
// 這裡跟資料互相關聯並沒有直接關係喔！！！
// 白話文：Category A 有很多別名為 children 的 Category，而那些 Category 靠 parentId 來跟 A 連接。
Category.hasMany(Category, { as: 'children', foreignKey: 'parentId' });
// 白話文：Category A 有個別名為 parent 的 Category，而它靠 parentId 來跟 A 連接。
Category.belongsTo(Category, { as: 'parent', foreignKey: 'parentId' });
Category.hasMany(Transaction);
Transaction.belongsTo(Category);

Account.hasMany(Transaction);
Transaction.belongsTo(Account);

// 白話文：Transaction A 有個別名為 target 的 Transaction，而 A 靠 linkId 與 Transaction B 連接。
Transaction.belongsTo(Transaction, { as: 'target', foreignKey: 'linkId' });
// 白話文：Transaction A 有個別名為 targetAccount 的 Account，而 A 靠 targetAccountId 與 Account 連接。
Transaction.belongsTo(Account, {
  as: 'targetAccount',
  foreignKey: 'targetAccountId',
});

startDailyReminderCronJobs();
startWeeklySummaryNoticeCronJobs();
startMonthlyAnalysisNoticeCronJobs();

export { app };

const startServer = async () => {
  try {
    // await mongoConnection();

    // 只有非測試環境才啟動 Server
    // Supertest 會自動找空的 port 啟動 Server，所以測試環境不需要啟動
    if (process.env.NODE_ENV !== 'test') {
      const port = parseInt(process.env.PORT || '3000', 10);
      app.listen(port, '0.0.0.0', () => {
        console.log(`Server running on port ${port}`);
      });
    }
  } catch (error) {
    console.error('Failed to start server:', error);
  }
};

startServer();
