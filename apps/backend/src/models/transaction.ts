import Sequelize, { Model } from 'sequelize';
import sequelize, { TABLE_DEFAULT_SETTING } from '@/utils/postgres';
import { TransactionType, RootType, PaymentFrequency } from '@repo/shared';

export interface TransactionAttributes extends TransactionType {
  linkId?: string | null;
  targetAccountId?: string | null;
}
export interface TransactionInstance
  extends Model<TransactionAttributes>,
    TransactionAttributes {}

const Transaction = sequelize.define<TransactionInstance>(
  'transaction',
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
    },
    accountId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'account',
        key: 'id',
      },
    },
    categoryId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'category',
        key: 'id',
      },
    },
    amount: {
      type: Sequelize.DECIMAL(20, 5),
      allowNull: false,
    },
    type: {
      type: Sequelize.ENUM(RootType.INCOME, RootType.EXPENSE, RootType.OPERATE),
      allowNull: false,
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    // 年月日
    date: {
      type: Sequelize.DATEONLY, // 只存年月日，e.g. 2025-12-11
      allowNull: false,
    },
    // 入帳日 (信用卡帳單歸屬日)
    billingDate: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    // 時分秒
    time: {
      type: Sequelize.TIME, // 只存時分秒，e.g. 12:34:56
      allowNull: false,
    },
    receipt: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    paymentFrequency: {
      type: Sequelize.ENUM(
        PaymentFrequency.ONE_TIME,
        PaymentFrequency.RECURRING,
        PaymentFrequency.INSTALLMENT
      ),
      allowNull: false,
    },
    // 互指對方 ID
    linkId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'transaction',
        key: 'id',
      },
    },
    // 互指對方帳戶 ID
    targetAccountId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'account',
        key: 'id',
      },
    },
    installmentPlanId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'installment_plan',
        key: 'id',
      },
    },
    isReconciled: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    reconciliationDate: {
      type: Sequelize.DATE,
      allowNull: true,
    },
  },
  TABLE_DEFAULT_SETTING
);

export default Transaction;
