import Sequelize, { Model } from 'sequelize';
import sequelize, { TABLE_DEFAULT_SETTING } from '@/utils/postgres';
import { CreditCardDetailType } from '@repo/shared';

type CreditCardDetailCreationAttributes = Omit<CreditCardDetailType, 'id'>;

export interface CreditCardDetailInstance
  extends Model<CreditCardDetailType, CreditCardDetailCreationAttributes>,
    CreditCardDetailType {}

const CreditCardDetail = sequelize.define<CreditCardDetailInstance>(
  'credit_card_detail',
  {
    id: {
      type: Sequelize.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    },
    accountId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'account',
        key: 'id',
      },
      unique: true,
      onDelete: 'CASCADE',
    },
    statementDate: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    paymentDueDate: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    gracePeriod: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    interestRate: {
      type: Sequelize.DECIMAL(5, 2), // e.g. 15.50
      allowNull: true,
    },
    creditLimit: {
      type: Sequelize.DECIMAL(20, 5),
      allowNull: true,
    },
    includeInTotal: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
  },
  TABLE_DEFAULT_SETTING
);

export default CreditCardDetail;
