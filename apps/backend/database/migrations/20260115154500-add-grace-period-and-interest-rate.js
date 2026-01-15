'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
      { tableName: 'credit_card_detail', schema: 'accounting' },
      'gracePeriod',
      {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      }
    );
    await queryInterface.addColumn(
      { tableName: 'credit_card_detail', schema: 'accounting' },
      'interestRate',
      {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      }
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn(
      { tableName: 'credit_card_detail', schema: 'accounting' },
      'gracePeriod'
    );
    await queryInterface.removeColumn(
      { tableName: 'credit_card_detail', schema: 'accounting' },
      'interestRate'
    );
  },
};
