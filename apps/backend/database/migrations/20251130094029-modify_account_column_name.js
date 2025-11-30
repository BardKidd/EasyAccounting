'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.renameColumn(
      {
        tableName: 'account',
        schema: 'accounting',
      },
      'daysUnitDue',
      'daysUntilDue'
    );
  },

  async down(queryInterface, Sequelize) {},
};
