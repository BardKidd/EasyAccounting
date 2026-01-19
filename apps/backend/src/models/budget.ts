import Sequelize, { Model, Optional } from 'sequelize';
import sequelize, { TABLE_DEFAULT_SETTING } from '@/utils/postgres';

export enum BudgetCycleType {
  YEAR = 'YEAR',
  MONTH = 'MONTH',
  WEEK = 'WEEK',
  DAY = 'DAY',
}

export interface BudgetAttributes {
  id: string;
  userId: string;
  name: string;
  description?: string;
  amount: number;
  cycleType: BudgetCycleType;
  cycleStartDay: number;
  startDate: string; // DateOnly
  endDate?: string; // DateOnly
  isRecurring: boolean;
  rollover: boolean;
  isActive: boolean;
  currencyId?: number;
  pendingAmount?: number;
  alert80SentAt?: Date;
  alert100SentAt?: Date;
  isRecalculating: boolean;
  lastRecalculatedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export interface BudgetCreationAttributes
  extends Optional<BudgetAttributes, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'isActive' | 'isRecalculating' | 'rollover' | 'isRecurring'> {}

export interface BudgetInstance
  extends Model<BudgetAttributes, BudgetCreationAttributes>,
    BudgetAttributes {}

const Budget = sequelize.define<BudgetInstance>(
  'budget',
  {
    id: {
      type: Sequelize.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    },
    userId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'user',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    name: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    amount: {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: false,
    },
    cycleType: {
      type: Sequelize.ENUM(...Object.values(BudgetCycleType)),
      allowNull: false,
    },
    cycleStartDay: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    startDate: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    endDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    isRecurring: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    rollover: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isActive: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    currencyId: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    pendingAmount: {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: true,
    },
    alert80SentAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    alert100SentAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    isRecalculating: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    lastRecalculatedAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
  },
  {
    ...TABLE_DEFAULT_SETTING,
  }
);

export default Budget;
