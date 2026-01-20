import Sequelize, { Model, Optional } from 'sequelize';
import sequelize, { TABLE_DEFAULT_SETTING } from '@/utils/postgres';

export interface TransactionBudgetAttributes {
  id: string;
  transactionId: string;
  budgetId: string;
  createdAt?: Date;
}

export interface TransactionBudgetCreationAttributes
  extends Optional<TransactionBudgetAttributes, 'id' | 'createdAt'> {}

export interface TransactionBudgetInstance
  extends Model<TransactionBudgetAttributes, TransactionBudgetCreationAttributes>,
    TransactionBudgetAttributes {}

const TransactionBudget = sequelize.define<TransactionBudgetInstance>(
  'transaction_budget',
  {
    id: {
      type: Sequelize.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    },
    transactionId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'transaction',
        key: 'id',
      },
      onDelete: 'CASCADE',
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
  },
  {
    ...TABLE_DEFAULT_SETTING,
    paranoid: false,
    updatedAt: false,
  }
);

export default TransactionBudget;
