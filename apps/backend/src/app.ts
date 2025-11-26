import express from 'express';
import path from 'path';
import sequelize from './utils/database';

import User from './models/user';
import Category from './models/category';

import userRoute from './routes/userRoute';
import categoryRoute from './routes/categoryRoute';

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', categoryRoute);
app.use('/api', userRoute);

User.hasMany(Category);
Category.belongsTo(User);

// 可以使用 Magic 方法，加上 include 可以自動建立 children 和 parent 屬性
// 這裡跟資料互相關聯並沒有直接關係喔！！！
Category.hasMany(Category, { as: 'children', foreignKey: 'parentId' });
Category.belongsTo(Category, { as: 'parent', foreignKey: 'parentId' });

sequelize
  .sync()
  .then(() => {
    app.listen(3000, () => {
      console.log('Server running on port 3000');
    });
  })
  .catch((error) => {
    console.error('Failed to sync database:', error);
  });
