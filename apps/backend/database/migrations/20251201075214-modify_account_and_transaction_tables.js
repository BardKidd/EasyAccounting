'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. 修改 Transaction 的 date 欄位為 DATEONLY
    await queryInterface.changeColumn(
      { tableName: 'transaction', schema: 'accounting' },
      'date',
      {
        type: Sequelize.DATEONLY,
        allowNull: false,
      }
    );

    // 2. 修改 Account 的 daysUntilDue 欄位允許 NULL
    await queryInterface.changeColumn(
      { tableName: 'account', schema: 'accounting' },
      'daysUntilDue',
      {
        type: Sequelize.INTEGER,
        allowNull: true,
      }
    );
  },

  async down(queryInterface, Sequelize) {},
};
