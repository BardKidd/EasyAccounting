'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = 'accounting';

    // 1. Create credit_card_detail
    await queryInterface.createTable(
      'credit_card_detail',
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        accountId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: { tableName: 'account', schema },
            key: 'id',
          },
          onDelete: 'CASCADE',
          unique: true,
        },
        statementDate: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        paymentDueDate: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        creditLimit: {
          type: Sequelize.DECIMAL(20, 5),
          allowNull: true,
        },
        includeInTotal: {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
          allowNull: false,
        },
        isArchived: {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          allowNull: false,
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('NOW'),
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('NOW'),
        },
      },
      { schema }
    );

    // 2. Create installment_plan
    await queryInterface.createTable(
      'installment_plan',
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        userId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: { tableName: 'user', schema },
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
        totalAmount: {
          type: Sequelize.DECIMAL(20, 5),
          allowNull: false,
        },
        totalInstallments: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        startDate: {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        description: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        interestType: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'NONE',
        },
        calculationMethod: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'ROUND',
        },
        remainderPlacement: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'FIRST',
        },
        gracePeriod: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          allowNull: false,
        },
        rewardsType: {
          type: Sequelize.STRING,
          defaultValue: 'EVERY',
          allowNull: false,
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('NOW'),
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('NOW'),
        },
      },
      { schema }
    );

    // 3. Add columns to transaction
    await queryInterface.addColumn(
      { tableName: 'transaction', schema },
      'installmentPlanId',
      {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: { tableName: 'installment_plan', schema },
          key: 'id',
        },
        onDelete: 'SET NULL',
      }
    );

    await queryInterface.addColumn(
      { tableName: 'transaction', schema },
      'billingDate',
      {
        type: Sequelize.DATEONLY,
        allowNull: true,
      }
    );

    // Update existing transactions to set billingDate = date
    await queryInterface.sequelize.query(
      `UPDATE "accounting"."transaction" SET "billingDate" = "date" WHERE "billingDate" IS NULL`
    );

    // Enforce billingDate NOT NULL
    await queryInterface.changeColumn(
      { tableName: 'transaction', schema },
      'billingDate',
      {
        type: Sequelize.DATEONLY,
        allowNull: false,
      }
    );
  },

  async down(queryInterface, Sequelize) {
    const schema = 'accounting';
    await queryInterface.removeColumn(
      { tableName: 'transaction', schema },
      'billingDate'
    );
    await queryInterface.removeColumn(
      { tableName: 'transaction', schema },
      'installmentPlanId'
    );
    await queryInterface.dropTable({ tableName: 'installment_plan', schema });
    await queryInterface.dropTable({ tableName: 'credit_card_detail', schema });
  },
};
