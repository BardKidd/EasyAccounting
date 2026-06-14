import Sequelize, { Model, Optional, Op } from 'sequelize';
import sequelize, { TABLE_DEFAULT_SETTING } from '@/utils/postgres';

export interface BudgetAssignmentAttributes {
  id: string;
  userId: string;
  // 一般信封列：categoryId 非空、creditAccountId 為 null
  categoryId: string | null;
  // CC Payment 列（Phase 2 ④）：creditAccountId 非空、categoryId 為 null
  creditAccountId: string | null;
  month: string; // DATEONLY: 'YYYY-MM-DD' (always 1st of month)
  assigned: number; // 本位幣，可為負
}

export interface BudgetAssignmentCreationAttributes
  extends Optional<
    BudgetAssignmentAttributes,
    'id' | 'assigned' | 'categoryId' | 'creditAccountId'
  > {}

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
      allowNull: true, // CC Payment 列為 null（CHECK 約束 categoryId/creditAccountId 恰一非空）
      references: {
        model: 'category',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    creditAccountId: {
      type: Sequelize.UUID,
      allowNull: true, // 一般信封列為 null；CC Payment 列指向信用卡帳戶
      references: {
        model: 'account',
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
    // 兩個 partial unique index（envelope vs ccpay）。runtime 不 sync（靠 migration），
    // 此宣告為描述性；寫入用 findOrCreate+update 而非 .upsert()，故不依賴 ON CONFLICT 解析。
    indexes: [
      {
        unique: true,
        fields: ['userId', 'categoryId', 'month'],
        name: 'budget_assignment_envelope_uniq',
        where: { creditAccountId: null },
      },
      {
        unique: true,
        fields: ['userId', 'creditAccountId', 'month'],
        name: 'budget_assignment_ccpay_uniq',
        where: { creditAccountId: { [Op.ne]: null } },
      },
    ],
  },
);

export default BudgetAssignment;
