'use strict';
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = 'accounting';

    // 1. 找出測試使用者
    const userEmail = process.env.TEST_USER_EMAIL;
    if (!userEmail) {
      console.warn(
        'Skipping Account Seeder: process.env.TEST_USER_EMAIL is not defined.'
      );
      return;
    }

    // 使用 raw query 找 user id，避免依賴 Model
    const users = await queryInterface.sequelize.query(
      `SELECT id FROM accounting.user WHERE email = '${userEmail}' LIMIT 1;`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (users.length === 0) {
      console.warn(`Skipping Account Seeder: User ${userEmail} not found.`);
      return;
    }
    const userId = users[0].id;
    const now = new Date();

    // 2. 建立預設帳戶
    const accounts = [
      {
        id: uuidv4(),
        userId: userId,
        name: '現金錢包',
        type: '現金', // Account.CASH
        balance: 5000,
        icon: 'wallet',
        color: '#4CAF50', // Green
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uuidv4(),
        userId: userId,
        name: '薪資帳戶',
        type: '銀行', // Account.BANK
        balance: 100000, // Rich!
        icon: 'Banknote',
        color: '#2196F3', // Blue
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ];

    await queryInterface.bulkInsert(
      { schema, tableName: 'account' },
      accounts,
      {}
    );
  },

  async down(queryInterface, Sequelize) {
    const userEmail = process.env.TEST_USER_EMAIL;
    if (!userEmail) return;

    // 找出 user id
    const users = await queryInterface.sequelize.query(
      `SELECT id FROM accounting.user WHERE email = '${userEmail}' LIMIT 1;`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (users.length > 0) {
      const userId = users[0].id;
      await queryInterface.bulkDelete(
        { schema: 'accounting', tableName: 'account' },
        { userId: userId },
        {}
      );
    }
  },
};
