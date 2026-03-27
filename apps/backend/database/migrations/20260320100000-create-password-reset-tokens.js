'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = 'accounting';

    await queryInterface.createTable(
      'password_reset_token',
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
        token: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        expiresAt: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        usedAt: {
          type: Sequelize.DATE,
          allowNull: true,
          defaultValue: null,
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('NOW'),
        },
      },
      { schema },
    );

    // Index on token for O(1) lookup
    await queryInterface.addIndex(
      { tableName: 'password_reset_token', schema },
      ['token'],
      { name: 'password_reset_token_token_idx' },
    );

    // Index on userId for per-email rate limiting queries
    await queryInterface.addIndex(
      { tableName: 'password_reset_token', schema },
      ['userId'],
      { name: 'password_reset_token_userId_idx' },
    );
  },

  async down(queryInterface) {
    const schema = 'accounting';
    await queryInterface.dropTable({
      tableName: 'password_reset_token',
      schema,
    });
  },
};
