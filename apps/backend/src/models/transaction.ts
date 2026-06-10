import Sequelize, { Model } from 'sequelize';
import sequelize, { TABLE_DEFAULT_SETTING } from '@/utils/postgres';
import {
  TransactionType,
  RootType,
  PaymentFrequency,
  roundToBaseCurrency,
} from '@repo/shared';

export interface TransactionAttributes extends TransactionType {
  linkId?: string | null;
  targetAccountId?: string | null;
  transactionExtraId?: string | null;
  recurringTemplateId?: string | null;
  recurringSequence?: number | null;
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
    // 本位幣快照 = amount × baseRate，由下方 beforeSave hook 自動算出（呼叫端勿手動設）。
    amountInBase: {
      type: Sequelize.DECIMAL(20, 5),
      allowNull: false,
      defaultValue: 0,
    },
    // 原幣事實（選填）：記錄「我實際刷了 100 JPY」
    originalCurrencyCode: {
      type: Sequelize.STRING(3),
      allowNull: true,
    },
    originalAmount: {
      type: Sequelize.DECIMAL(20, 5),
      allowNull: true,
    },
    // 原幣 → 帳戶幣別 匯率快照
    exchangeRate: {
      type: Sequelize.DECIMAL(20, 10),
      allowNull: true,
    },
    // 帳戶幣別 → 本位幣 匯率快照（單幣時 = 1 或 null，hook 視 null 為 1）
    baseRate: {
      type: Sequelize.DECIMAL(20, 10),
      allowNull: true,
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
        PaymentFrequency.INSTALLMENT,
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
    transactionExtraId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'transaction_extra',
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
    recurringTemplateId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'recurring_transaction_template',
        key: 'id',
      },
    },
    recurringSequence: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
  },
  TABLE_DEFAULT_SETTING,
);

// 本位幣快照單一真實來源：amountInBase 永遠由 amount × baseRate 推導，呼叫端不得手動設。
// baseRate 為 null（單幣 / 未提供）時視為 1，故單幣使用者 amountInBase === amount（零回歸）。
// Phase 2 跨幣時 service 設定 baseRate，hook 自動算出正確本位幣快照。
const computeAmountInBase = (t: TransactionInstance) => {
  const amount = Number(t.amount) || 0;
  const rate = t.baseRate == null ? 1 : Number(t.baseRate);
  t.amountInBase = roundToBaseCurrency(amount * rate);
};
Transaction.addHook('beforeSave', computeAmountInBase);

export default Transaction;
