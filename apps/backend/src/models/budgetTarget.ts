import Sequelize, { Model, Optional } from 'sequelize';
import sequelize, { TABLE_DEFAULT_SETTING } from '@/utils/postgres';
import type { BudgetTargetType } from '@repo/shared';

export interface BudgetTargetAttributes {
  id: string;
  userId: string;
  categoryId: string;
  type: BudgetTargetType;
  amount: number;
  dueDate: string | null; // BALANCE_BY_DATE 用，其餘 null
}

export interface BudgetTargetCreationAttributes
  extends Optional<BudgetTargetAttributes, 'id' | 'amount' | 'dueDate'> {}

export interface BudgetTargetInstance
  extends Model<BudgetTargetAttributes, BudgetTargetCreationAttributes>,
    BudgetTargetAttributes {}

const BudgetTarget = sequelize.define<BudgetTargetInstance>(
  'budget_target',
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
      references: { model: 'user', key: 'id' },
    },
    categoryId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'category', key: 'id' },
      onDelete: 'CASCADE',
    },
    type: {
      type: Sequelize.ENUM('SET_ASIDE', 'REFILL', 'BALANCE_BY_DATE'),
      allowNull: false,
    },
    amount: {
      type: Sequelize.DECIMAL(20, 5),
      allowNull: false,
      defaultValue: 0,
    },
    dueDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    ...TABLE_DEFAULT_SETTING,
    // 刪 target 即硬刪（無歷史保留需求），避免 soft-delete 殘列撞 unique（同 budget_assignment 取捨）
    paranoid: false,
    indexes: [
      {
        unique: true,
        fields: ['userId', 'categoryId'],
        name: 'budget_target_user_cat_uniq',
      },
    ],
  },
);

export default BudgetTarget;
