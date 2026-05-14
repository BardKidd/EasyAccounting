'use strict';
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = 'accounting';
    const userEmail = process.env.TEST_USER_EMAIL;
    if (!userEmail) {
      console.warn(
        'Skipping Account Seeder: process.env.TEST_USER_EMAIL is not defined.'
      );
      return;
    }

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

    const demoBankId = uuidv4();
    const demoCashId = uuidv4();
    const demoCreditCardId = uuidv4();

    // 1. 建立帳戶
    await queryInterface.bulkInsert(
      { schema, tableName: 'account' },
      [
        {
          id: demoBankId,
          userId,
          name: '台新薪轉戶 🏦',
          type: '銀行',
          balance: 155000,
          icon: 'building-columns',
          color: '#e74c3c',
          isArchived: false,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: demoCashId,
          userId,
          name: '日常錢包 💵',
          type: '現金',
          balance: 4500,
          icon: 'wallet',
          color: '#f1c40f',
          isArchived: false,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: demoCreditCardId,
          userId,
          name: '國泰 CUBE 卡 💳',
          type: '信用卡',
          balance: -24800,
          icon: 'credit-card',
          color: '#27ae60',
          isArchived: false,
          createdAt: now,
          updatedAt: now,
        },
      ],
      {}
    );

    // 2. 建立信用卡專屬設定
    await queryInterface.bulkInsert(
      { schema, tableName: 'credit_card_detail' },
      [
        {
          id: uuidv4(),
          accountId: demoCreditCardId,
          creditLimit: 100000,
          statementDate: 25,
          paymentDueDate: 10,
          includeInTotal: true,
          gracePeriod: 0,
          createdAt: now,
          updatedAt: now,
        },
      ],
      {}
    );
  },

  async down(queryInterface, Sequelize) {
    const userEmail = process.env.TEST_USER_EMAIL;
    if (!userEmail) return;

    const users = await queryInterface.sequelize.query(
      `SELECT id FROM accounting.user WHERE email = '${userEmail}' LIMIT 1;`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (users.length > 0) {
      const userId = users[0].id;

      // 先刪信用卡設定
      const accounts = await queryInterface.sequelize.query(
        `SELECT id FROM accounting.account WHERE "userId" = '${userId}';`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      if (accounts.length > 0) {
        const accountIds = accounts.map((a) => `'${a.id}'`).join(',');
        await queryInterface.sequelize.query(
          `DELETE FROM accounting.credit_card_detail WHERE "accountId" IN (${accountIds});`
        );
      }

      await queryInterface.bulkDelete(
        { schema: 'accounting', tableName: 'account' },
        { userId },
        {}
      );
    }
  },
};
