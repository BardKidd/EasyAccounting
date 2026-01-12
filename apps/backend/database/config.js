const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  // 本地
  development: {
    username: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
    host: process.env.PG_HOST,
    port: parseInt(process.env.PG_PORT),
    dialect: 'postgres',
    schema: 'accounting',
    dialectOptions: undefined,
  },
  // CI
  test: {
    username: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
    host: process.env.PG_HOST,
    port: parseInt(process.env.PG_PORT),
    dialect: 'postgres',
    schema: 'accounting',
    dialectOptions: undefined,
  },
  // 雲端(不論測試還是生產)
  production: {
    username: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
    host: process.env.PG_HOST,
    port: parseInt(process.env.PG_PORT),
    dialect: 'postgres',
    schema: 'accounting',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  },
};
