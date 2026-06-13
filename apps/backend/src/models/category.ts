import Sequelize, { Model, Optional } from 'sequelize';
import sequelize, { TABLE_DEFAULT_SETTING } from '@/utils/postgres';
import { RootType, MainType, SubType, CategoryType } from '@repo/shared';

const allCategories = [...Object.values(RootType)];

export interface CategoryAttributes
  extends Omit<CategoryType, 'parent' | 'children'> {}

export interface CategoryCreationAttributes
  extends Optional<CategoryAttributes, 'id'> {}

export interface CategoryInstance
  extends Model<CategoryAttributes, CategoryCreationAttributes>,
    CategoryAttributes {}

const Category = sequelize.define<CategoryInstance>(
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
      onDelete: 'CASCADE',
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
      onDelete: 'CASCADE',
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
  // soft-delete（paranoid:true，沿用 TABLE_DEFAULT_SETTING）：
  // 預算需保留已刪分類的歷史信封並標註「（已刪除）」(budget-ynab §9)，
  // 且 transaction.categoryId FK 為 onDelete:CASCADE——若硬刪分類會連帶物理刪除其交易（資料遺失）。
  // soft-delete 不觸發 DB CASCADE，故交易得以保留、activity 維持沖銷。
  // 連帶子分類的刪除改由 models/index.ts 的 Category.afterDestroy hook 串接。
  { ...TABLE_DEFAULT_SETTING },
);

export default Category;
