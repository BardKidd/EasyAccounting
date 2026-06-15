import Sequelize, { Model, Optional } from 'sequelize';
import sequelize, { TABLE_DEFAULT_SETTING } from '@/utils/postgres';

// 交易 ⇄ 標籤 多對多中介表。v1 複合 PK (transactionId, tagId)，掛整筆交易。
// splitId 為 Phase B per-split 標籤預留（v1 恆為 null，尚無 transaction_split FK）。
export interface TransactionTagAttributes {
  transactionId: string;
  tagId: string;
  splitId: string | null;
}

export interface TransactionTagCreationAttributes
  extends Optional<TransactionTagAttributes, 'splitId'> {}

export interface TransactionTagInstance
  extends Model<TransactionTagAttributes, TransactionTagCreationAttributes>,
    TransactionTagAttributes {}

const TransactionTag = sequelize.define<TransactionTagInstance>(
  'transaction_tag',
  {
    transactionId: {
      type: Sequelize.UUID,
      allowNull: false,
      primaryKey: true,
      references: { model: 'transaction', key: 'id' },
      onDelete: 'CASCADE',
    },
    tagId: {
      type: Sequelize.UUID,
      allowNull: false,
      primaryKey: true,
      references: { model: 'tag', key: 'id' },
      onDelete: 'CASCADE',
    },
    // Phase B 預留（per-split 標籤）；v1 無 transaction_split 表，故不加 FK。
    splitId: {
      type: Sequelize.UUID,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    ...TABLE_DEFAULT_SETTING,
    // 純關聯表：硬刪 + 無 timestamps。belongsToMany.setTags 靠 DELETE/INSERT，
    // soft-delete 會讓殘列撞複合 PK。
    paranoid: false,
    timestamps: false,
  },
);

export default TransactionTag;
