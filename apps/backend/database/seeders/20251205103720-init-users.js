'use strict';
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const hashedPassword = await bcrypt.hash('Gundamseed0922', 12);

    await queryInterface.bulkInsert(
      { schema: 'accounting', tableName: 'user' },
      [
        {
          id: uuidv4(),
          name: 'admin',
          email: 'rinouo0922@icloud.com',
          password: hashedPassword,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {}
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete(
      { schema: 'accounting', tableName: 'user' },
      { email: 'rinouo0922@icloud.com' },
      {}
    );
  },
};
