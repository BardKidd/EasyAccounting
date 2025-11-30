import Sequelize from 'sequelize';
import sequelize, { TABLE_DEFAULT_SETTING } from '../utils/postgres';
import { AccountType, PaymentStatus } from '@repo/shared';

const Account = sequelize.define(
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
      type: Sequelize.ENUM(...Object.values(AccountType)),
      allowNull: false,
    },
    balance: {
      type: Sequelize.DECIMAL(10, 5),
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
      type: Sequelize.DECIMAL(10, 5),
      allowNull: true,
    },
    unpaidAmount: {
      type: Sequelize.DECIMAL(10, 5),
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
    daysUnitDue: Sequelize.INTEGER,
  },
  TABLE_DEFAULT_SETTING
);

export default Account;
