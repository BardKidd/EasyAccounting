'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
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
    const schema = 'accounting';

    // 1. Create Schema
    await queryInterface.createSchema(schema);

    // 2. Create User Table
    await queryInterface.createTable(
      'user',
      {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        email: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true,
        },
        password: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        ...timestamps,
      },
      { schema }
    );

    // 3. Create Category Table
    await queryInterface.createTable(
      'category',
      {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
        },
        userId: {
          type: Sequelize.UUID,
          references: {
            model: {
              tableName: 'user',
              schema,
            },
            key: 'id',
          },
          allowNull: true,
          onDelete: 'CASCADE',
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        type: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        parentId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: {
              tableName: 'category',
              schema,
            },
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
        icon: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        color: {
          type: Sequelize.STRING,
          allowNull: true,
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

    // 4. Create Account Table
    await queryInterface.createTable(
      'account',
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
          type: Sequelize.STRING,
          allowNull: false,
        },
        type: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        balance: {
          type: Sequelize.DECIMAL(20, 5),
          allowNull: false,
        },
        icon: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        color: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: '#000000',
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        ...timestamps,
      },
      { schema }
    );

    // 5. Create Transaction Table
    await queryInterface.createTable(
      'transaction',
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
        accountId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: {
              tableName: 'account',
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
          type: Sequelize.DECIMAL(20, 5),
          allowNull: false,
        },
        type: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        date: {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        time: {
          type: Sequelize.TIME,
          allowNull: false,
        },
        receipt: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        paymentFrequency: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        linkId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: {
              tableName: 'transaction',
              schema,
            },
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
        targetAccountId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: {
              tableName: 'account',
              schema,
            },
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
        ...timestamps,
      },
      { schema }
    );

    // 6. Create Personnel Notification Table (THIS WAS MISSING BEFORE)
    await queryInterface.createTable(
      'personnel_notification',
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
        dailyReminder: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        weeklySummaryNotice: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        monthlyAnalysisNotice: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        ...timestamps,
      },
      { schema }
    );
  },

  async down(queryInterface, Sequelize) {
    // Drop Schema (Cacades to tables)
    await queryInterface.dropSchema('accounting', { cascade: true });
  },
};
