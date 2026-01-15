'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = 'accounting';
    await queryInterface.addColumn(
      { tableName: 'transaction', schema },
      'isReconciled',
      {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      }
    );
    await queryInterface.addColumn(
      { tableName: 'transaction', schema },
      'reconciliationDate',
      {
        type: Sequelize.DATE,
        allowNull: true,
      }
    );
  },

  async down(queryInterface, Sequelize) {
    const schema = 'accounting';
    await queryInterface.removeColumn(
      { tableName: 'transaction', schema },
      'reconciliationDate'
    );
    await queryInterface.removeColumn(
      { tableName: 'transaction', schema },
      'isReconciled'
    );
  },
};
