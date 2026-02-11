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
    };

    // 1. Create pending_transaction status ENUM
    await queryInterface.sequelize.query(
      `CREATE TYPE "accounting"."enum_pending_transaction_status" AS ENUM ('PENDING', 'CONFIRMED', 'SKIPPED');`,
    );

    // 2. Create merchant_mapping Table
    await queryInterface.createTable(
      'merchant_mapping',
      {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
        },
        merchantName: {
          type: Sequelize.STRING(255),
          allowNull: false,
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
        matchCount: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1,
        },
        ...timestamps,
      },
      { schema },
    );

    // merchant_mapping UNIQUE constraint
    await queryInterface.addConstraint(
      { tableName: 'merchant_mapping', schema },
      {
        fields: ['merchantName', 'categoryId'],
        type: 'unique',
        name: 'merchant_mapping_merchantName_categoryId_uk',
      },
    );

    // 3. Create pending_transaction Table
    await queryInterface.createTable(
      'pending_transaction',
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
        uploadBatchId: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        rawMerchantName: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        suggestedCategoryId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: {
              tableName: 'category',
              schema,
            },
            key: 'id',
          },
          onDelete: 'SET NULL',
        },
        matchedTransactionId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: {
              tableName: 'transaction',
              schema,
            },
            key: 'id',
          },
          onDelete: 'SET NULL',
        },
        isInstallment: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        installmentNumber: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        status: {
          type: `"${schema}"."enum_pending_transaction_status"`,
          allowNull: false,
          defaultValue: 'PENDING',
        },
        transactionData: {
          type: Sequelize.JSONB,
          allowNull: false,
        },
        ...timestamps,
      },
      { schema },
    );

    // 4. Create bill_parse_telemetry Table (append-only, no updatedAt)
    await queryInterface.createTable(
      'bill_parse_telemetry',
      {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
        },
        uploadBatchId: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        totalTransactions: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        modifiedTransactions: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        skippedTransactions: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        accuracyRate: {
          type: Sequelize.DECIMAL(5, 4),
          allowNull: true,
        },
        parseTimeMs: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        processingMode: {
          type: Sequelize.STRING(10),
          allowNull: true,
        },
        llmProvider: {
          type: Sequelize.STRING(50),
          allowNull: true,
        },
        llmModel: {
          type: Sequelize.STRING(100),
          allowNull: true,
        },
        pageCount: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('NOW'),
        },
      },
      { schema },
    );
  },

  async down(queryInterface, Sequelize) {
    const schema = 'accounting';
    await queryInterface.dropTable({
      tableName: 'bill_parse_telemetry',
      schema,
    });
    await queryInterface.dropTable({
      tableName: 'pending_transaction',
      schema,
    });
    await queryInterface.removeConstraint(
      { tableName: 'merchant_mapping', schema },
      'merchant_mapping_merchantName_categoryId_uk',
    );
    await queryInterface.dropTable({ tableName: 'merchant_mapping', schema });
    await queryInterface.sequelize.query(
      `DROP TYPE IF EXISTS "accounting"."enum_pending_transaction_status";`,
    );
  },
};
