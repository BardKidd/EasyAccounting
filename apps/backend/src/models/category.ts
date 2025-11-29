import Sequelize from 'sequelize';
import sequelize from '../utils/postgres';
import { MainType, SubType, DetailType } from '@repo/shared';

const allCategories = [
  ...Object.values(MainType),
  ...Object.values(SubType),
  ...Object.values(DetailType),
];

const Category = sequelize.define(
  'category',
  {
    id: {
      type: Sequelize.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
      unique: true,
    },
    // 只有 user 自己建立的才會有 id，預設的項目就不會有。
    userId: {
      type: Sequelize.UUID,
      references: {
        model: 'users', // 去 DB 看會幫你建立的是複數寫法
        key: 'id',
      },
      allowNull: true, // 允許 null,但需要在 API 層驗證是否有傳遞
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    type: {
      type: Sequelize.ENUM(...allCategories),
      allowNull: false,
    },
    parentId: {
      type: Sequelize.UUID,
      allowNull: true,
      // 前端傳入 parentId 時會在這裡去關聯 id 資料，所以實際上關聯兩筆資料是透過這裡去關聯的。
      references: {
        model: 'categories', // 去 DB 看會幫你建立的是複數寫法
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    icon: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    color: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  },
  {
    schema: 'accounting',
  }
);

export default Category;
