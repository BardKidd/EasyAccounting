import Sequelize, { Model } from 'sequelize';
import sequelize, { TABLE_DEFAULT_SETTING } from '@/utils/postgres';
import {
  Account as AccountEnum,
  AccountType,
  PaymentStatus,
  CreditAccountType,
} from '@repo/shared';

type AccountAttributes = AccountType & Partial<CreditAccountType>;

type AccountCreationAttributes = Omit<AccountAttributes, 'id'>;

// 這個型別說明建立出來的 Model instance 要包含 AccountAttributes 的所有屬性，當使用 toJson() 後會剩下 AccountAttributes 的所有屬性
interface AccountInstance
  extends Model<AccountAttributes, AccountCreationAttributes>,
    AccountAttributes {}

const Account = sequelize.define<AccountInstance>(
  'account',
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
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    type: {
      type: Sequelize.ENUM(...Object.values(AccountEnum)),
      allowNull: false,
    },
    balance: {
      type: Sequelize.DECIMAL(20, 5),
      allowNull: false,
    },
    icon: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    color: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: '#000000',
    },
    isActive: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    // 信用卡專用
    creditLimit: {
      type: Sequelize.DECIMAL(20, 5),
      allowNull: true,
    },
    unpaidAmount: {
      type: Sequelize.DECIMAL(20, 5),
      allowNull: true,
    },
    billingDay: {
      // 每個月的繳款日
      type: Sequelize.DATE,
      allowNull: true,
    },
    nextBillingDate: {
      // 下次繳款日
      type: Sequelize.DATE,
      allowNull: true,
    },
    paymentStatus: {
      type: Sequelize.ENUM(...Object.values(PaymentStatus)),
      allowNull: true,
    },
    daysUntilDue: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
  },
  TABLE_DEFAULT_SETTING
);

export default Account;
