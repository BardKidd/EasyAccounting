import Sequelize, { Model, Optional } from 'sequelize';
import sequelize, { TABLE_DEFAULT_SETTING } from '@/utils/postgres';
import { ExchangeRateSource } from '@repo/shared';

export interface ExchangeRateAttributes {
  id: string;
  baseCode: string; // 來源幣別 → quoteCode
  quoteCode: string;
  rate: number; // 1 baseCode = rate quoteCode
  rateDate: string; // DATEONLY
  source: ExchangeRateSource;
  provider?: string | null;
}

export interface ExchangeRateCreationAttributes
  extends Optional<ExchangeRateAttributes, 'id' | 'source' | 'provider'> {}

export interface ExchangeRateInstance
  extends Model<ExchangeRateAttributes, ExchangeRateCreationAttributes>,
    ExchangeRateAttributes {}

// 匯率時間序列表：歷史匯率是多幣淨值/趨勢的唯一正確來源。
// 查某日匯率 = 取 rateDate <= 目標日 最近一筆。共用維度表，不軟刪除、不在 User cascade 內。
const ExchangeRate = sequelize.define<ExchangeRateInstance>(
  'exchange_rate',
  {
    id: {
      type: Sequelize.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    },
    baseCode: {
      type: Sequelize.STRING(3),
      allowNull: false,
      references: { model: 'currency', key: 'code' },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    },
    quoteCode: {
      type: Sequelize.STRING(3),
      allowNull: false,
      references: { model: 'currency', key: 'code' },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    },
    rate: {
      type: Sequelize.DECIMAL(20, 10),
      allowNull: false,
    },
    rateDate: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    source: {
      type: Sequelize.ENUM(...Object.values(ExchangeRateSource)),
      allowNull: false,
      defaultValue: ExchangeRateSource.MANUAL,
    },
    provider: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  },
  {
    ...TABLE_DEFAULT_SETTING,
    paranoid: false,
    indexes: [
      {
        unique: true,
        fields: ['baseCode', 'quoteCode', 'rateDate', 'source'],
        name: 'exchange_rate_base_quote_date_source_uniq',
      },
    ],
  },
);

export default ExchangeRate;
