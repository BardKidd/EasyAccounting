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
import PersonnelNotification from '@/models/personnel_notification';

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
    origin: `${process.env.ORIGIN_URL}`,
    credentials: true,
  })
);

if (process.env.NODE_ENV === 'development' && process.env.DEV_ACCESS_PASSWORD) {
  // 有多位測試人員
  const parseUsers = (envString: string) => {
    const users: { [key: string]: string } = {};
    envString.split(',').forEach((pair) => {
      const [user, pass] = pair.split(':');
      if (user && pass) {
        users[user.trim()] = pass.trim();
      }
    });
    return users;
  };

  app.use((req, res, next) => {
    // API 請求不需要 Basic Auth
    if (req.path.startsWith('/api')) return next();

    return basicAuth({
      users: parseUsers(process.env.DEV_ACCESS_PASSWORD as string), // 使用者名稱固定為 admin
      challenge: true, // 會彈出瀏覽器內建的登入視窗
      unauthorizedResponse: '🔒 你不是測試人員，請你離開',
    })(req, res, next);
  });
}

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
app.use('/api', deployHealthRoute);
// 透過 Hook 實作軟刪除的 Cascade (Sequelize 的 hooks: true 只有再某些版本有效，手寫最穩)
User.addHook('afterDestroy', async (user: any, options: any) => {
  const transaction = options.transaction;
  const userId = user.id;

  // 1. 刪除相關 Account
  await Account.destroy({ where: { userId }, transaction });
  // 2. 刪除相關 Transaction
  await Transaction.destroy({ where: { userId }, transaction });
  // 3. 刪除相關 Notification
  await PersonnelNotification.destroy({ where: { userId }, transaction });
});

User.hasMany(Category);
User.hasMany(Account);
User.hasMany(Transaction);
Category.belongsTo(User);
Account.belongsTo(User);
Transaction.belongsTo(User);

User.hasOne(PersonnelNotification);
PersonnelNotification.belongsTo(User);

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
    await mongoConnection();

    // 只有非測試環境才啟動 Server
    // Supertest 會自動找空的 port 啟動 Server，所以測試環境不需要啟動
    if (process.env.NODE_ENV !== 'test') {
      const port = process.env.PORT || 3000;
      app.listen(port, () => {
        console.log(`Server running on port ${port}`);
      });
    }
  } catch (error) {
    console.error('Failed to start server:', error);
  }
};

startServer();
