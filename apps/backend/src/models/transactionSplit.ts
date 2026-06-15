import Sequelize, { Model, Optional } from 'sequelize';
import sequelize, { TABLE_DEFAULT_SETTING } from '@/utils/postgres';

// 拆分子項：一筆交易底下的「分類 + 金額」。spec docs/specs/split-tags-spec.md（S2/S5）。
// amount 為原幣毛額，amountInBase = amount × 父交易 baseRate（寫入時快照，純毛額不含 extra）。
// extra 攤提不存在此（在 DB view transaction_split_unit 依比例計算），保持子項金額純粹。
export interface TransactionSplitAttributes {
  id: string;
  transactionId: string;
  categoryId: string;
  amount: number;
  amountInBase: number;
  note: string | null;
  sortOrder: number;
}

export interface TransactionSplitCreationAttributes
  extends Optional<
    TransactionSplitAttributes,
    'id' | 'amountInBase' | 'note' | 'sortOrder'
  > {}

export interface TransactionSplitInstance
  extends Model<TransactionSplitAttributes, TransactionSplitCreationAttributes>,
    TransactionSplitAttributes {}

const TransactionSplit = sequelize.define<TransactionSplitInstance>(
  'transaction_split',
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
      references: { model: 'transaction', key: 'id' },
      onDelete: 'CASCADE',
    },
    categoryId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'category', key: 'id' },
    },
    amount: {
      type: Sequelize.DECIMAL(20, 5),
      allowNull: false,
    },
    amountInBase: {
      type: Sequelize.DECIMAL(20, 5),
      allowNull: false,
      defaultValue: 0,
    },
    note: {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null,
    },
    sortOrder: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    ...TABLE_DEFAULT_SETTING,
    // 硬刪 + 無 timestamps：更新交易時「先全刪舊子項再建新」，soft-delete 會累積殘列且讓
    // view 需多濾 deletedAt。串接刪除由 Transaction.afterDestroy hook 處理。
    paranoid: false,
    timestamps: false,
  },
);

export default TransactionSplit;
