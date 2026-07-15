'use strict';

/**
 * Web Push 訂閱表（PWA 推播，spec §6）。
 *  - push_subscription：userId FK（CASCADE）、endpoint unique、p256dh、auth。
 *  - hard-delete（無 deletedAt）：失效訂閱 410/404 當場刪；避免 soft-delete 殘列撞 UNIQUE(endpoint)。
 *
 * accounting schema 下 FK / index 一律 schema 限定。
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = 'accounting';
    await queryInterface.sequelize.transaction(async (t) => {
      const opt = { transaction: t };

      await queryInterface.createTable(
        { tableName: 'push_subscription', schema },
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
            references: { model: { tableName: 'user', schema }, key: 'id' },
            onDelete: 'CASCADE',
          },
          endpoint: { type: Sequelize.TEXT, allowNull: false },
          p256dh: { type: Sequelize.STRING, allowNull: false },
          auth: { type: Sequelize.STRING, allowNull: false },
          createdAt: { type: Sequelize.DATE, allowNull: false },
          updatedAt: { type: Sequelize.DATE, allowNull: false },
        },
        opt,
      );

      await queryInterface.addIndex(
        { tableName: 'push_subscription', schema },
        {
          fields: ['endpoint'],
          unique: true,
          name: 'push_subscription_endpoint_uniq',
          transaction: t,
        },
      );

      await queryInterface.addIndex(
        { tableName: 'push_subscription', schema },
        {
          fields: ['userId'],
          name: 'push_subscription_user_idx',
          transaction: t,
        },
      );
    });
  },

  async down(queryInterface, Sequelize) {
    const schema = 'accounting';
    await queryInterface.dropTable({ tableName: 'push_subscription', schema });
  },
};
