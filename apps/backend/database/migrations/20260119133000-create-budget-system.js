'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = 'accounting';
    const timestamps = {
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
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    };

    // 1. Create Budget Table
    await queryInterface.createTable(
      'budget',
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
        name: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        amount: {
          type: Sequelize.DECIMAL(15, 2),
          allowNull: false,
        },
        cycleType: {
          type: Sequelize.STRING, // ENUM: YEAR, MONTH, WEEK, DAY
          allowNull: false,
        },
        cycleStartDay: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        startDate: {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        endDate: {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        isRecurring: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        rollover: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        currencyId: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        pendingAmount: {
          type: Sequelize.DECIMAL(15, 2),
          allowNull: true,
        },
        alert80SentAt: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        alert100SentAt: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        isRecalculating: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        lastRecalculatedAt: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        ...timestamps,
      },
      { schema }
    );

    // 2. Create BudgetCategory Table
    await queryInterface.createTable(
      'budget_category',
      {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
        },
        budgetId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: {
              tableName: 'budget',
              schema,
            },
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
        categoryId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: {
              tableName: 'category',
              schema,
            },
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
        amount: {
          type: Sequelize.DECIMAL(15, 2),
          allowNull: false,
        },
        isExcluded: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
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

    // 3. Create TransactionBudget Table
    await queryInterface.createTable(
      'transaction_budget',
      {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
        },
        transactionId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: {
              tableName: 'transaction',
              schema,
            },
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
        budgetId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: {
              tableName: 'budget',
              schema,
            },
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('NOW'),
        },
      },
      { schema }
    );

    // 4. Create BudgetPeriodSnapshot Table
    await queryInterface.createTable(
      'budget_period_snapshot',
      {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
        },
        budgetId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: {
              tableName: 'budget',
              schema,
            },
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
        periodStart: {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        periodEnd: {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        budgetAmount: {
          type: Sequelize.DECIMAL(15, 2),
          allowNull: false,
        },
        spentAmount: {
          type: Sequelize.DECIMAL(15, 2),
          allowNull: false,
        },
        rolloverIn: {
          type: Sequelize.DECIMAL(15, 2),
          allowNull: false,
          defaultValue: 0,
        },
        rolloverOut: {
          type: Sequelize.DECIMAL(15, 2),
          allowNull: false,
          defaultValue: 0,
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('NOW'),
        },
        lastRecalculatedAt: {
          type: Sequelize.DATE,
          allowNull: true,
        },
      },
      { schema }
    );
  },

  async down(queryInterface, Sequelize) {
    const schema = 'accounting';
    await queryInterface.dropTable({ tableName: 'budget_period_snapshot', schema });
    await queryInterface.dropTable({ tableName: 'transaction_budget', schema });
    await queryInterface.dropTable({ tableName: 'budget_category', schema });
    await queryInterface.dropTable({ tableName: 'budget', schema });
  },
};
