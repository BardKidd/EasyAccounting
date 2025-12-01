import Sequelize from 'sequelize';
import sequelize, { TABLE_DEFAULT_SETTING } from '../utils/postgres';
import { MainType, PaymentFrequency } from '@repo/shared';

const Transaction = sequelize.define(
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
      type: Sequelize.DECIMAL(10, 5),
      allowNull: false,
    },
    type: {
      type: Sequelize.ENUM(MainType.INCOME, MainType.EXPENSE),
      allowNull: false,
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    // 年月日
    date: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    // 時分秒
    time: {
      type: Sequelize.TIME,
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
  },
  TABLE_DEFAULT_SETTING
);

export default Transaction;
