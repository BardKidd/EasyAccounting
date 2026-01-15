import Sequelize, { Model } from 'sequelize';
import sequelize, { TABLE_DEFAULT_SETTING } from '@/utils/postgres';
import {
  Account as AccountEnum,
  AccountType,
  PaymentStatus,
  CreditAccountType,
} from '@repo/shared';

type AccountAttributes = AccountType;

type AccountCreationAttributes = Omit<AccountAttributes, 'id'>;

import { CreditCardDetailInstance } from './CreditCardDetail';

// 這個型別說明建立出來的 Model instance 要包含 AccountAttributes 的所有屬性，當使用 toJson() 後會剩下 AccountAttributes 的所有屬性
interface AccountInstance
  extends Model<AccountAttributes, AccountCreationAttributes>,
    AccountAttributes {
  credit_card_detail?: CreditCardDetailInstance;
}

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
    isArchived: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  TABLE_DEFAULT_SETTING
);

export default Account;
