'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn(
      { tableName: 'transaction', schema: 'accounting' },
      'amount',
      {
        type: Sequelize.DECIMAL(20, 5),
        allowNull: false,
      }
    );
  },

  async down(queryInterface, Sequelize) {},
};
