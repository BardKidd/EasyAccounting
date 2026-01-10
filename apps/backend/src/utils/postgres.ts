import { Sequelize, ModelOptions } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
  process.env.PG_DATABASE as string,
  process.env.PG_USER as string,
  process.env.PG_PASSWORD as string,
  {
    dialect: 'postgres',
    dialectOptions:
      process.env.NODE_ENV === 'production' || process.env.PG_SSL === 'true'
        ? {
            ssl: {
              require: true,
              rejectUnauthorized: false,
            },
          }
        : undefined,
    host: process.env.PG_HOST,
    port: parseInt(process.env.PG_PORT || '5432', 10),
  }
);

export const TABLE_DEFAULT_SETTING: ModelOptions = {
  schema: 'accounting',
  paranoid: true,
  timestamps: true,
  freezeTableName: true,
};

export default sequelize;
