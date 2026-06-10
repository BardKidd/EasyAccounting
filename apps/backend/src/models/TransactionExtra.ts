import Sequelize, { Model, Optional } from 'sequelize';
import sequelize, { TABLE_DEFAULT_SETTING } from '@/utils/postgres';

export interface TransactionExtraAttributes {
  id: string;
  extraAdd: number;
  extraAddLabel: string;
  extraMinus: number;
  extraMinusLabel: string;
  // 本位幣快照：extra{Add,Minus} × 交易 baseRate（單幣時 = 原值）。由 service 層顯式寫入（非 model hook）。
  extraAddInBase: number;
  extraMinusInBase: number;
}

export interface TransactionExtraCreationAttributes
  extends Optional<
    TransactionExtraAttributes,
    | 'id'
    | 'extraAdd'
    | 'extraAddLabel'
    | 'extraMinus'
    | 'extraMinusLabel'
    | 'extraAddInBase'
    | 'extraMinusInBase'
  > {}

export interface TransactionExtraInstance
  extends Model<TransactionExtraAttributes, TransactionExtraCreationAttributes>,
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
    extraAddInBase: {
      type: Sequelize.DECIMAL(20, 5),
      allowNull: false,
      defaultValue: 0,
    },
    extraMinusInBase: {
      type: Sequelize.DECIMAL(20, 5),
      allowNull: false,
      defaultValue: 0,
    },
  },
  TABLE_DEFAULT_SETTING
);

export default TransactionExtra;
