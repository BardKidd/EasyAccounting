import Sequelize, { Model, Optional } from 'sequelize';
import sequelize, { TABLE_DEFAULT_SETTING } from '@/utils/postgres';

export interface CurrencyAttributes {
  code: string; // ISO 4217（PK）
  name: string;
  symbol: string;
  decimalPlaces: number;
  isCrypto: boolean;
  isActive: boolean;
}

export interface CurrencyCreationAttributes
  extends Optional<
    CurrencyAttributes,
    'decimalPlaces' | 'isCrypto' | 'isActive'
  > {}

export interface CurrencyInstance
  extends Model<CurrencyAttributes, CurrencyCreationAttributes>,
    CurrencyAttributes {}

// 幣別維度表：加新幣別只需 seed 一列。
// 共用維度表，刻意「不軟刪除」（paranoid:false），且不在任何 User cascade hook 內。
const Currency = sequelize.define<CurrencyInstance>(
  'currency',
  {
    code: {
      type: Sequelize.STRING(3),
      allowNull: false,
      primaryKey: true,
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    symbol: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    decimalPlaces: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 2,
    },
    isCrypto: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isActive: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    ...TABLE_DEFAULT_SETTING,
    paranoid: false,
  },
);

export default Currency;
