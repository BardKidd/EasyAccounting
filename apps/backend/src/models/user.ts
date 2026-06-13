import Sequelize, { Model } from 'sequelize';
import sequelize, { TABLE_DEFAULT_SETTING } from '@/utils/postgres';

type UserAttributes = {
  id: string;
  name: string;
  email: string;
  password: string;
  isGuest: boolean;
  lastActivityAt: Date | null;
  baseCurrencyCode: string;
  budgetStartMonth: string | null;
};

export interface UserInstance extends Model<UserAttributes>, UserAttributes {}

const User = sequelize.define<UserInstance>(
  'user',
  {
    id: {
      type: Sequelize.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    email: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    isGuest: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    lastActivityAt: {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null,
    },
    // 本位幣（報表 / 淨值呈現的個人偏好）。Phase 1 一律 'TWD'。
    baseCurrencyCode: {
      type: Sequelize.STRING(3),
      allowNull: false,
      defaultValue: 'TWD',
      references: { model: 'currency', key: 'code' },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    },
    budgetStartMonth: {
      type: Sequelize.DATEONLY,
      allowNull: true,
      defaultValue: null,
    },
  },
  TABLE_DEFAULT_SETTING,
);

export default User;
