'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = 'accounting';

    await queryInterface.addColumn(
      { tableName: 'credit_card_detail', schema },
      'deletedAt',
      {
        type: Sequelize.DATE,
        allowNull: true,
      }
    );

    await queryInterface.addColumn(
      { tableName: 'installment_plan', schema },
      'deletedAt',
      {
        type: Sequelize.DATE,
        allowNull: true,
      }
    );
  },

  async down(queryInterface, Sequelize) {
    const schema = 'accounting';
    await queryInterface.removeColumn(
      { tableName: 'credit_card_detail', schema },
      'deletedAt'
    );
    await queryInterface.removeColumn(
      { tableName: 'installment_plan', schema },
      'deletedAt'
    );
  },
};
