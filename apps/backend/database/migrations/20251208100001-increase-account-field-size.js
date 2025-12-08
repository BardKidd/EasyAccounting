'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn(
      { tableName: 'account', schema: 'accounting' },
      'balance',
      {
        type: Sequelize.DECIMAL(20, 5),
        allowNull: true,
      }
    );
    await queryInterface.changeColumn(
      { tableName: 'account', schema: 'accounting' },
      'creditLimit',
      {
        type: Sequelize.DECIMAL(20, 5),
        allowNull: true,
      }
    );
    await queryInterface.changeColumn(
      { tableName: 'account', schema: 'accounting' },
      'unpaidAmount',
      {
        type: Sequelize.DECIMAL(20, 5),
        allowNull: true,
      }
    );
  },

  async down(queryInterface, Sequelize) {},
};
