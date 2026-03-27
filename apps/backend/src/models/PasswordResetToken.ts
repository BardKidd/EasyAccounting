import Sequelize, { Model, Optional } from 'sequelize';
import sequelize from '@/utils/postgres';

type PasswordResetTokenAttributes = {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  usedAt: Date | null;
};

type PasswordResetTokenCreationAttributes = Optional<
  PasswordResetTokenAttributes,
  'id' | 'usedAt'
>;

export interface PasswordResetTokenInstance
  extends Model<
      PasswordResetTokenAttributes,
      PasswordResetTokenCreationAttributes
    >,
    PasswordResetTokenAttributes {
  readonly createdAt: Date;
}

const PasswordResetToken = sequelize.define<PasswordResetTokenInstance>(
  'password_reset_token',
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
    },
    token: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    expiresAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    usedAt: {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    schema: 'accounting',
    timestamps: true,
    updatedAt: false,
    freezeTableName: true,
  },
);

export default PasswordResetToken;
