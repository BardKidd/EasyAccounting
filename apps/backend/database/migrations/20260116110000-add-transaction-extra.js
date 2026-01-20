'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = 'accounting';
    
    // 1. Create transaction_extra table
    await queryInterface.createTable(
      { tableName: 'transaction_extra', schema },
      {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
        },
        extraAdd: {
          type: Sequelize.DECIMAL(20, 5),
          allowNull: false,
          defaultValue: 0,
        },
        extraAddLabel: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: '折扣',
        },
        extraMinus: {
          type: Sequelize.DECIMAL(20, 5),
          allowNull: false,
          defaultValue: 0,
        },
        extraMinusLabel: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: '手續費',
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        deletedAt: {
          allowNull: true,
          type: Sequelize.DATE,
        },
      }
    );

    // 2. Add transactionExtraId to transaction table
    await queryInterface.addColumn(
      { tableName: 'transaction', schema },
      'transactionExtraId',
      {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: {
            tableName: 'transaction_extra',
            schema: schema,
          },
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }
    );
  },

  async down(queryInterface, Sequelize) {
    const schema = 'accounting';
    
    await queryInterface.removeColumn(
      { tableName: 'transaction', schema },
      'transactionExtraId'
    );
    
    await queryInterface.dropTable({ tableName: 'transaction_extra', schema });
  },
};
