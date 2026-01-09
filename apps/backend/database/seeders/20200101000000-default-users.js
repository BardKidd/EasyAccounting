'use strict';
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const hashedPassword = await bcrypt.hash(
      process.env.TEST_USER_PASSWORD,
      12
    );
    const userId = uuidv4();
    const now = new Date();

    await queryInterface.bulkInsert(
      { schema: 'accounting', tableName: 'user' },
      [
        {
          id: userId,
          name: 'admin',
          email: process.env.TEST_USER_EMAIL,
          password: hashedPassword,
          createdAt: now,
          updatedAt: now,
        },
      ],
      {}
    );

    // Create Notification Settings
    await queryInterface.bulkInsert(
      { schema: 'accounting', tableName: 'personnel_notification' },
      [
        {
          id: uuidv4(),
          userId: userId,
          dailyReminder: false,
          weeklySummaryNotice: false,
          monthlyAnalysisNotice: true, // Enable monthly report by default
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

    // Use subquery to delete notification first (optional if cascade exists, but good for completeness)
    const users = await queryInterface.sequelize.query(
      `SELECT id FROM accounting.user WHERE email = '${userEmail}' LIMIT 1;`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (users.length > 0) {
      const userId = users[0].id;
      await queryInterface.bulkDelete(
        { schema: 'accounting', tableName: 'personnel_notification' },
        { userId: userId },
        {}
      );
    }

    await queryInterface.bulkDelete(
      { schema: 'accounting', tableName: 'user' },
      { email: userEmail },
      {}
    );
  },
};
