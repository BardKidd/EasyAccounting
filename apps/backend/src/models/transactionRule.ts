import Sequelize, { Model, Optional } from 'sequelize';
import sequelize, { TABLE_DEFAULT_SETTING } from '@/utils/postgres';
import { RuleMatchMode, RootType } from '@repo/shared';

// 使用者自訂分類規則（Rules Engine Phase B，rules-engine-spec R6）。
// 條件（全部 AND）：description 文字比對 + 金額區間 + 交易類型；
// 動作：套分類（setCategoryId）+ 套標籤（transaction_rule_tag 多對多）。
// 套用僅在「新建 / 匯入」（手動 / Excel / 帳單確認），不回溯、不套轉帳/拆分/週期/編輯（R10/R11）。
export interface TransactionRuleAttributes {
  id: string;
  userId: string;
  name: string | null;
  // asc 先評，值小先跑；同值以 createdAt 破平手（resolver）。
  priority: number;
  isEnabled: boolean;
  // 條件（皆選填，已填者 AND）
  descriptionMatch: string | null;
  matchMode: RuleMatchMode;
  amountMin: number | null;
  amountMax: number | null;
  // null = 任意；限 EXPENSE / INCOME
  transactionType: RootType | null;
  // 動作：套分類（軟刪分類時套用階段跳過，R12）
  setCategoryId: string | null;
}

export interface TransactionRuleCreationAttributes
  extends Optional<
    TransactionRuleAttributes,
    | 'id'
    | 'name'
    | 'priority'
    | 'isEnabled'
    | 'descriptionMatch'
    | 'matchMode'
    | 'amountMin'
    | 'amountMax'
    | 'transactionType'
    | 'setCategoryId'
  > {}

export interface TransactionRuleInstance
  extends Model<TransactionRuleAttributes, TransactionRuleCreationAttributes>,
    TransactionRuleAttributes {}

const TransactionRule = sequelize.define<TransactionRuleInstance>(
  'transaction_rule',
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
      onDelete: 'CASCADE',
    },
    name: {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null,
    },
    priority: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    isEnabled: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    descriptionMatch: {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null,
    },
    matchMode: {
      type: Sequelize.ENUM(
        RuleMatchMode.CONTAINS,
        RuleMatchMode.EQUALS,
        RuleMatchMode.STARTS_WITH,
      ),
      allowNull: false,
      defaultValue: RuleMatchMode.CONTAINS,
    },
    amountMin: {
      type: Sequelize.DECIMAL(20, 5),
      allowNull: true,
      defaultValue: null,
    },
    amountMax: {
      type: Sequelize.DECIMAL(20, 5),
      allowNull: true,
      defaultValue: null,
    },
    transactionType: {
      type: Sequelize.ENUM(RootType.EXPENSE, RootType.INCOME),
      allowNull: true,
      defaultValue: null,
    },
    setCategoryId: {
      type: Sequelize.UUID,
      allowNull: true,
      defaultValue: null,
      references: { model: 'category', key: 'id' },
      // 分類多為 soft-delete（不觸發 DB CASCADE）；硬刪時 null 掉動作欄避免懸空 FK。
      onDelete: 'SET NULL',
    },
  },
  {
    ...TABLE_DEFAULT_SETTING,
    // 硬刪（無歷史保留需求；isEnabled 提供停用）。刪 rule 由 index.ts 的
    // TransactionRule.afterDestroy 串接清 transaction_rule_tag。
    paranoid: false,
    indexes: [{ fields: ['userId'], name: 'transaction_rule_user_idx' }],
  },
);

export default TransactionRule;
