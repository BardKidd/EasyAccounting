'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = 'accounting';

    // 1. Create Enums
    await queryInterface.sequelize.query(
      `DROP TYPE IF EXISTS "accounting"."enum_recurring_template_frequency" CASCADE;`,
    );
    await queryInterface.sequelize.query(
      `CREATE TYPE "accounting"."enum_recurring_template_frequency" AS ENUM ('MONTHLY', 'WEEKLY', 'YEARLY');`,
    );
    await queryInterface.sequelize.query(
      `DROP TYPE IF EXISTS "accounting"."enum_recurring_template_status" CASCADE;`,
    );
    await queryInterface.sequelize.query(
      `CREATE TYPE "accounting"."enum_recurring_template_status" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');`,
    );

    // 2. Create recurring_template Table
    await queryInterface.createTable(
      'recurring_template',
      {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
        },
        userId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: {
              tableName: 'user',
              schema,
            },
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
        frequency: {
          type: `"${schema}"."enum_recurring_template_frequency"`,
          allowNull: false,
        },
        dayOfMonth: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        dayOfWeek: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        monthDay: {
          type: Sequelize.STRING(5),
          allowNull: true,
        },
        totalOccurrences: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        currentOccurrence: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        nextExecutionDate: {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        status: {
          type: `"${schema}"."enum_recurring_template_status"`,
          allowNull: false,
          defaultValue: 'ACTIVE',
        },
        baseTransactionAttrs: {
          type: Sequelize.JSONB,
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
      { schema },
    );

    // 3. Add columns to transaction table
    await queryInterface.addColumn(
      { tableName: 'transaction', schema },
      'recurringTemplateId',
      {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: {
            tableName: 'recurring_template',
            schema: 'accounting',
          },
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
    );

    await queryInterface.addColumn(
      { tableName: 'transaction', schema },
      'recurringSequence',
      {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
    );
  },

  async down(queryInterface, Sequelize) {
    const schema = 'accounting';

    await queryInterface.removeColumn(
      { tableName: 'transaction', schema },
      'recurringSequence',
    );
    await queryInterface.removeColumn(
      { tableName: 'transaction', schema },
      'recurringTemplateId',
    );

    await queryInterface.dropTable({
      tableName: 'recurring_template',
      schema,
    });

    await queryInterface.sequelize.query(
      `DROP TYPE IF EXISTS "accounting"."enum_recurring_template_status";`,
    );
    await queryInterface.sequelize.query(
      `DROP TYPE IF EXISTS "accounting"."enum_recurring_template_frequency";`,
    );
  },
};
