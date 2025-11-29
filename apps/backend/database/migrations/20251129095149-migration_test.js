'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      { tableName: 'users', schema: 'accounting' },
      'age',
      {
        type: Sequelize.INTEGER,
      }
    );
  },

  async down(queryInterface, Sequelize) {},
};
