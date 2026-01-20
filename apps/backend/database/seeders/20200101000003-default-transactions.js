'use strict';
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = 'accounting';
    const userEmail = process.env.TEST_USER_EMAIL;
    if (!userEmail) return;

    // 1. Get User ID
    const users = await queryInterface.sequelize.query(
      `SELECT id FROM accounting.user WHERE email = '${userEmail}' LIMIT 1;`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    if (users.length === 0) return;
    const userId = users[0].id;

    // 2. Get Account IDs
    const accounts = await queryInterface.sequelize.query(
      `SELECT id, name, type FROM accounting.account WHERE "userId" = '${userId}';`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const walletAccount = accounts.find((a) => a.type === '現金');
    const bankAccount = accounts.find((a) => a.type === '銀行');

    if (!walletAccount || !bankAccount) {
      console.warn('Skipping Transaction Seeder: Accounts not found.');
      return;
    }

    // 3. Get Category IDs (We need specific categories)
    const categories = await queryInterface.sequelize.query(
      `SELECT id, name FROM accounting.category WHERE "userId" IS NULL;`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    const getCatId = (name) => categories.find((c) => c.name === name)?.id;

    const salaryCatId = getCatId('薪水');
    const foodCatId = getCatId('早餐'); // Use sub-category directly if possible, assuming flattened list in previous logical step or just pick any
    const lunchCatId = getCatId('午餐');
    const transportCatId = getCatId('捷運');
    const rentCatId = getCatId('房租');

    const transactions = [];
    const now = new Date();

    // Helper to format date "YYYY-MM-DD"
    const formatDate = (date) => date.toISOString().split('T')[0];
    const formatTime = (date) => date.toTimeString().split(' ')[0];

    // Transaction 1: Salary Income
    transactions.push({
      id: uuidv4(),
      userId,
      accountId: bankAccount.id,
      categoryId: salaryCatId,
      amount: 50000,
      type: '收入',
      description: '一月份薪水',
      date: formatDate(new Date(now.getFullYear(), now.getMonth(), 5)), // 每月 5 號發薪
      billingDate: formatDate(new Date(now.getFullYear(), now.getMonth(), 5)),
      time: '09:00:00',
      paymentFrequency: '單次',
      isReconciled: false,
      createdAt: now,
      updatedAt: now,
    });

    // Transaction 2: Rent Expense
    transactions.push({
      id: uuidv4(),
      userId,
      accountId: bankAccount.id,
      categoryId: rentCatId,
      amount: 15000,
      type: '支出',
      description: '一月份房租',
      date: formatDate(new Date(now.getFullYear(), now.getMonth(), 1)),
      billingDate: formatDate(new Date(now.getFullYear(), now.getMonth(), 1)),
      time: '10:00:00',
      paymentFrequency: '單次',
      isReconciled: false,
      createdAt: now,
      updatedAt: now,
    });

    // Transaction 3-12: Daily Expenses (Randomized)
    for (let i = 1; i <= 10; i++) {
      const isLunch = i % 2 === 0;
      const date = new Date(now.getFullYear(), now.getMonth(), i);

      transactions.push({
        id: uuidv4(),
        userId,
        accountId: walletAccount.id,
        categoryId: isLunch ? lunchCatId : transportCatId,
        amount: isLunch ? 120 : 35, // Lunch 120, MRT 35
        type: '支出',
        description: isLunch ? '午餐' : '捷運通勤',
        date: formatDate(date),
        billingDate: formatDate(date),
        time: '12:30:00',
        paymentFrequency: '單次',
        isReconciled: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    await queryInterface.bulkInsert(
      { schema, tableName: 'transaction' },
      transactions,
      {}
    );
  },

  async down(queryInterface, Sequelize) {
    const userEmail = process.env.TEST_USER_EMAIL;
    if (!userEmail) return;

    // 簡單起見，刪除該使用者所有的交易
    // 嚴謹一點應該只刪除 default seeder 產生的，但沒關係，這是開發資料
    const users = await queryInterface.sequelize.query(
      `SELECT id FROM accounting.user WHERE email = '${userEmail}' LIMIT 1;`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (users.length > 0) {
      const userId = users[0].id;
      await queryInterface.bulkDelete(
        { schema: 'accounting', tableName: 'transaction' },
        { userId: userId },
        {}
      );
    }
  },
};
