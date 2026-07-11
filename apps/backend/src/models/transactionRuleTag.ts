import Sequelize, { Model } from 'sequelize';
import sequelize, { TABLE_DEFAULT_SETTING } from '@/utils/postgres';

// 規則 ⇄ 標籤 多對多中介表（Rules Engine Phase B）。
// 規則命中時，這些標籤加到交易上（所有命中規則的標籤取聯集，R9）。
export interface TransactionRuleTagAttributes {
  ruleId: string;
  tagId: string;
}

export interface TransactionRuleTagInstance
  extends Model<TransactionRuleTagAttributes>,
    TransactionRuleTagAttributes {}

const TransactionRuleTag = sequelize.define<TransactionRuleTagInstance>(
  'transaction_rule_tag',
  {
    ruleId: {
      type: Sequelize.UUID,
      allowNull: false,
      primaryKey: true,
      references: { model: 'transaction_rule', key: 'id' },
      onDelete: 'CASCADE',
    },
    tagId: {
      type: Sequelize.UUID,
      allowNull: false,
      primaryKey: true,
      references: { model: 'tag', key: 'id' },
      onDelete: 'CASCADE',
    },
  },
  {
    ...TABLE_DEFAULT_SETTING,
    // 純關聯表：硬刪 + 無 timestamps（同 transaction_tag）。
    paranoid: false,
    timestamps: false,
  },
);

export default TransactionRuleTag;
