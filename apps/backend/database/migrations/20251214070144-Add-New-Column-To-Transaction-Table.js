'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      {
        tableName: 'transaction',
        schema: 'accounting',
      },
      'linkId',
      {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'transaction',
          key: 'id',
        },
      }
    );
    await queryInterface.addColumn(
      { tableName: 'transaction', schema: 'accounting' },
      'targetAccountId',
      {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'account',
          key: 'id',
        },
      }
    );
  },

  async down(queryInterface, Sequelize) {},
};
