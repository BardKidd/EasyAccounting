'use strict';

/**
 * 拆分交易 + 標籤 Phase A：tag 與 transaction_tag 表（spec docs/specs/split-tags-spec.md §5.3）。
 *
 * - tag：使用者自訂標籤。UNIQUE(userId, name) 為 on-the-fly 建立的冪等錨點；硬刪（無 deletedAt），
 *   isArchived 提供「不刪只隱藏」。
 * - transaction_tag：多對多中介，複合 PK (transactionId, tagId)，無 timestamps。
 *   splitId 為 Phase B per-split 標籤預留（v1 純 nullable UUID，尚無 transaction_split FK）。
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = 'accounting';

    await queryInterface.sequelize.transaction(async (t) => {
      const opt = { transaction: t };

      // ---- tag ----
      await queryInterface.createTable(
        { tableName: 'tag', schema },
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
            onUpdate: 'CASCADE',
          },
          name: { type: Sequelize.STRING, allowNull: false },
          color: {
            type: Sequelize.STRING,
            allowNull: false,
            defaultValue: '#6b7280',
          },
          groupName: {
            type: Sequelize.STRING,
            allowNull: true,
            defaultValue: null,
          },
          isArchived: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          createdAt: { allowNull: false, type: Sequelize.DATE },
          updatedAt: { allowNull: false, type: Sequelize.DATE },
        },
        opt,
      );

      // UNIQUE(userId, name) — 每使用者每名稱至多一個 tag（on-the-fly 建立冪等錨點）
      await queryInterface.addIndex(
        { tableName: 'tag', schema },
        {
          unique: true,
          fields: ['userId', 'name'],
          name: 'tag_user_name_uniq',
          transaction: t,
        },
      );

      // ---- transaction_tag（多對多中介）----
      await queryInterface.createTable(
        { tableName: 'transaction_tag', schema },
        {
          transactionId: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true,
            references: {
              model: { tableName: 'transaction', schema },
              key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          tagId: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true,
            references: { model: { tableName: 'tag', schema }, key: 'id' },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          // Phase B per-split 標籤預留（v1 恆 null，尚無 transaction_split FK）
          splitId: {
            type: Sequelize.UUID,
            allowNull: true,
            defaultValue: null,
          },
        },
        opt,
      );
    });
  },

  async down(queryInterface, Sequelize) {
    const schema = 'accounting';

    await queryInterface.sequelize.transaction(async (t) => {
      const opt = { transaction: t };
      // 先刪子表（FK 指向 tag）
      await queryInterface.dropTable(
        { tableName: 'transaction_tag', schema },
        opt,
      );
      await queryInterface.dropTable({ tableName: 'tag', schema }, opt);
    });
  },
};
