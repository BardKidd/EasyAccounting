import Sequelize, { Model, Optional } from 'sequelize';
import sequelize, { TABLE_DEFAULT_SETTING } from '@/utils/postgres';
import { PendingTransactionStatus } from '@repo/shared';

export interface PendingTransactionAttributes {
  id: string;
  userId: string;
  uploadBatchId: string;
  rawMerchantName: string;
  suggestedCategoryId: string | null;
  matchedTransactionId: string | null;
  isInstallment: boolean;
  installmentNumber: number | null;
  status: PendingTransactionStatus;
  transactionData: Record<string, unknown>;
}

export interface PendingTransactionCreationAttributes
  extends Optional<
    PendingTransactionAttributes,
    | 'id'
    | 'suggestedCategoryId'
    | 'matchedTransactionId'
    | 'isInstallment'
    | 'installmentNumber'
    | 'status'
  > {}

export interface PendingTransactionInstance
  extends Model<
      PendingTransactionAttributes,
      PendingTransactionCreationAttributes
    >,
    PendingTransactionAttributes {}

const PendingTransaction = sequelize.define<PendingTransactionInstance>(
  'pending_transaction',
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
      onDelete: 'CASCADE',
    },
    uploadBatchId: {
      type: Sequelize.UUID,
      allowNull: false,
    },
    rawMerchantName: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    suggestedCategoryId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'category',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    matchedTransactionId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'transaction',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    isInstallment: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    installmentNumber: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    status: {
      type: Sequelize.ENUM(
        PendingTransactionStatus.PENDING,
        PendingTransactionStatus.CONFIRMED,
        PendingTransactionStatus.SKIPPED,
      ),
      allowNull: false,
      defaultValue: PendingTransactionStatus.PENDING,
    },
    transactionData: {
      type: Sequelize.JSONB,
      allowNull: false,
    },
  },
  {
    ...TABLE_DEFAULT_SETTING,
    paranoid: false,
  },
);

export default PendingTransaction;
