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
import PersonnelNotification from './models/personnel_notification';

import userRoute from '@/routes/userRoute';
import categoryRoute from '@/routes/categoryRoute';
import announcementRoute from '@/routes/announcementRoute';
import accountRoute from '@/routes/accountRoute';
import transactionRoute from '@/routes/transactionRoute';
import authRoute from '@/routes/authRoute';
import cookieParser from 'cookie-parser';
import statisticsRoute from '@/routes/statisticsRoute';
import personnelNotificationRoute from '@/routes/personnelNotificationRoute';
import {
  startDailyReminderCronJobs,
  startMonthlyAnalysisNoticeCronJobs,
  startWeeklySummaryNoticeCronJobs,
} from './cron/notificationCron';

const app = express();

// CORS 設定
app.use(
  cors({
    origin: 'http://localhost:8080',
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

sequelize
  .sync()
  .then(() => {
    return mongoConnection();
  })
  .then(() => {
    app.listen(3000, () => {
      console.log('Server running on port 3000');
    });
  })
  .catch((error) => {
    console.error('Failed to sync database:', error);
  });
