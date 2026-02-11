import Sequelize, { Model, Optional } from 'sequelize';
import sequelize, { TABLE_DEFAULT_SETTING } from '@/utils/postgres';

export interface BillParseTelemetryAttributes {
  id: string;
  uploadBatchId: string;
  totalTransactions: number;
  modifiedTransactions: number;
  skippedTransactions: number;
  accuracyRate: number | null;
  parseTimeMs: number | null;
  processingMode: string | null;
  llmProvider: string | null;
  llmModel: string | null;
  pageCount: number | null;
}

export interface BillParseTelemetryCreationAttributes
  extends Optional<
    BillParseTelemetryAttributes,
    | 'id'
    | 'totalTransactions'
    | 'modifiedTransactions'
    | 'skippedTransactions'
    | 'accuracyRate'
    | 'parseTimeMs'
    | 'processingMode'
    | 'llmProvider'
    | 'llmModel'
    | 'pageCount'
  > {}

export interface BillParseTelemetryInstance
  extends Model<
      BillParseTelemetryAttributes,
      BillParseTelemetryCreationAttributes
    >,
    BillParseTelemetryAttributes {}

const BillParseTelemetry = sequelize.define<BillParseTelemetryInstance>(
  'bill_parse_telemetry',
  {
    id: {
      type: Sequelize.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    },
    uploadBatchId: {
      type: Sequelize.UUID,
      allowNull: false,
    },
    totalTransactions: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    modifiedTransactions: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    skippedTransactions: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    accuracyRate: {
      type: Sequelize.DECIMAL(5, 4),
      allowNull: true,
    },
    parseTimeMs: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    processingMode: {
      type: Sequelize.STRING(10),
      allowNull: true,
    },
    llmProvider: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    llmModel: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    pageCount: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
  },
  {
    ...TABLE_DEFAULT_SETTING,
    paranoid: false,
    updatedAt: false,
  },
);

export default BillParseTelemetry;
