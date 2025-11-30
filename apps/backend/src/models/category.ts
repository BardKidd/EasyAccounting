import Sequelize from 'sequelize';
import sequelize, { TABLE_DEFAULT_SETTING } from '../utils/postgres';
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
    },
    // 只有 user 自己建立的才會有 id，預設的項目就不會有。
    userId: {
      type: Sequelize.UUID,
      references: {
        model: 'user',
        key: 'id',
      },
      allowNull: true, // 允許 null,但需要在 API 層驗證是否有傳遞
      // onDelete: 'CASCADE', // 已經使用 paranoid 了，這裡沒意義。
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
        model: 'category',
        key: 'id',
      },
      // onDelete: 'CASCADE', // 已經使用 paranoid 了，這裡沒意義。
    },
    icon: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    color: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  },
  { ...TABLE_DEFAULT_SETTING, paranoid: false } // 目前覺得類別被刪除就被刪除了，反正只能刪除自己建立的資料
);

export default Category;
