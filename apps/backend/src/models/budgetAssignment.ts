import Sequelize, { Model, Optional } from 'sequelize';
import sequelize, { TABLE_DEFAULT_SETTING } from '@/utils/postgres';

export interface BudgetAssignmentAttributes {
  id: string;
  userId: string;
  categoryId: string;
  month: string; // DATEONLY: 'YYYY-MM-DD' (always 1st of month)
  assigned: number; // 本位幣，可為負
}

export interface BudgetAssignmentCreationAttributes
  extends Optional<BudgetAssignmentAttributes, 'id' | 'assigned'> {}

export interface BudgetAssignmentInstance
  extends Model<
    BudgetAssignmentAttributes,
    BudgetAssignmentCreationAttributes
  >,
    BudgetAssignmentAttributes {}

const BudgetAssignment = sequelize.define<BudgetAssignmentInstance>(
  'budget_assignment',
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
    month: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    assigned: {
      type: Sequelize.DECIMAL(20, 5),
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    ...TABLE_DEFAULT_SETTING,
    // spec §4.1：paranoid:false——soft-delete 殘留列會撞 unique 約束；assigned=0 即等同不存在
    paranoid: false,
    indexes: [
      {
        unique: true,
        fields: ['userId', 'categoryId', 'month'],
        name: 'budget_assignment_user_cat_month_uniq',
      },
    ],
  },
);

export default BudgetAssignment;
