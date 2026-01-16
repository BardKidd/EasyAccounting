import Sequelize, { Model } from 'sequelize';
import sequelize, { TABLE_DEFAULT_SETTING } from '@/utils/postgres';

export interface TransactionExtraAttributes {
  id: string;
  extraAdd: number;
  extraAddLabel: string;
  extraMinus: number;
  extraMinusLabel: string;
}

export interface TransactionExtraInstance
  extends Model<TransactionExtraAttributes>,
    TransactionExtraAttributes {}

const TransactionExtra = sequelize.define<TransactionExtraInstance>(
  'transaction_extra',
  {
    id: {
      type: Sequelize.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    },
    extraAdd: {
      type: Sequelize.DECIMAL(20, 5),
      allowNull: false,
      defaultValue: 0,
    },
    extraAddLabel: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: '折扣',
    },
    extraMinus: {
      type: Sequelize.DECIMAL(20, 5),
      allowNull: false,
      defaultValue: 0,
    },
    extraMinusLabel: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: '手續費',
    },
  },
  TABLE_DEFAULT_SETTING
);

export default TransactionExtra;
