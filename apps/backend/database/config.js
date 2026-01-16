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
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
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
    // CI 環境應使用測試環境，在該 container 中建立模擬的測試環境來測試，通常不需要 SSL
    dialectOptions: {
      ssl: false,
    },
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
