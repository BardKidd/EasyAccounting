import express from 'express';
import path from 'path';
import sequelize from './utils/postgres';
import mongoConnection from './utils/mongodb';

import User from './models/user';
import Category from './models/category';
import Account from './models/account';
import Transaction from './models/transaction';

import userRoute from './routes/userRoute';
import categoryRoute from './routes/categoryRoute';
import announcementRoute from './routes/announcementRoute';
import accountRoute from './routes/accountRoute';

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', categoryRoute);
app.use('/api', userRoute);
app.use('/api', announcementRoute);
app.use('/api', accountRoute);

User.hasMany(Category);
User.hasMany(Account);
User.hasMany(Transaction);
Category.belongsTo(User);
Account.belongsTo(User);
Transaction.belongsTo(User);

// 可以使用 Magic 方法，加上 include 可以自動建立 children 和 parent 屬性
// 這裡跟資料互相關聯並沒有直接關係喔！！！
// 取得 parentId 的關聯資料作為 children 或 parent。
Category.hasMany(Category, { as: 'children', foreignKey: 'parentId' });
Category.belongsTo(Category, { as: 'parent', foreignKey: 'parentId' });
Category.hasMany(Transaction);
Transaction.belongsTo(Category);

Account.hasMany(Transaction);
Transaction.belongsTo(Account);

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
