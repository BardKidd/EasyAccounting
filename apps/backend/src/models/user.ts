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
  tokenVersion: number;
  role: string;
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
    // 安全性(#8)：session 版本號。改密碼/重設時 +1，refresh 換證時比對使舊 token 失效。
    tokenVersion: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    // 安全性(#9)：權限角色（'user' | 'admin'）。管理端點（如公告）需 admin。
    role: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'user',
    },
  },
  TABLE_DEFAULT_SETTING,
);

export default User;
