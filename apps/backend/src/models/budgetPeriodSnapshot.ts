import Sequelize, { Model, Optional } from 'sequelize';
import sequelize, { TABLE_DEFAULT_SETTING } from '@/utils/postgres';

export interface BudgetPeriodSnapshotAttributes {
  id: string;
  budgetId: string;
  periodStart: string; // DateOnly
  periodEnd: string; // DateOnly
  budgetAmount: number;
  spentAmount: number;
  rolloverIn: number;
  rolloverOut: number;
  createdAt?: Date;
  lastRecalculatedAt?: Date;
}

export interface BudgetPeriodSnapshotCreationAttributes
  extends Optional<BudgetPeriodSnapshotAttributes, 'id' | 'createdAt' | 'lastRecalculatedAt' | 'rolloverIn' | 'rolloverOut'> {}

export interface BudgetPeriodSnapshotInstance
  extends Model<BudgetPeriodSnapshotAttributes, BudgetPeriodSnapshotCreationAttributes>,
    BudgetPeriodSnapshotAttributes {}

const BudgetPeriodSnapshot = sequelize.define<BudgetPeriodSnapshotInstance>(
  'budget_period_snapshot',
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
    periodStart: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    periodEnd: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    budgetAmount: {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: false,
    },
    spentAmount: {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: false,
    },
    rolloverIn: {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    rolloverOut: {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    lastRecalculatedAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
  },
  {
    ...TABLE_DEFAULT_SETTING,
    paranoid: false,
    updatedAt: false,
  }
);

export default BudgetPeriodSnapshot;
