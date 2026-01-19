import Sequelize, { Model, Optional } from 'sequelize';
import sequelize, { TABLE_DEFAULT_SETTING } from '@/utils/postgres';

export interface BudgetCategoryAttributes {
  id: string;
  budgetId: string;
  categoryId: string;
  amount: number;
  isExcluded: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BudgetCategoryCreationAttributes
  extends Optional<BudgetCategoryAttributes, 'id' | 'createdAt' | 'updatedAt' | 'isExcluded'> {}

export interface BudgetCategoryInstance
  extends Model<BudgetCategoryAttributes, BudgetCategoryCreationAttributes>,
    BudgetCategoryAttributes {}

const BudgetCategory = sequelize.define<BudgetCategoryInstance>(
  'budget_category',
  {
    id: {
      type: Sequelize.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    },
    budgetId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'budget',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    categoryId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'category',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    amount: {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: false,
    },
    isExcluded: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    ...TABLE_DEFAULT_SETTING,
    paranoid: false,
  }
);

export default BudgetCategory;
