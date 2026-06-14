'use strict';

/**
 * YNAB Phase 2 ③：budget_target 表（spec §4.5 / §9 P2-D10）。
 *
 * 每個支出 Main 信封可設一個 target；Underfunded 為純推導值不落庫。
 * type：SET_ASIDE（每月另存 X）/ REFILL（補滿到 X）/ BALANCE_BY_DATE（到期日前湊到 X）。
 * UNIQUE(userId, categoryId)：每位使用者每個分類至多一個 target（全域分類由各使用者各自設）。
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = 'accounting';

    await queryInterface.sequelize.transaction(async (t) => {
      const opt = { transaction: t };

      await queryInterface.createTable(
        { tableName: 'budget_target', schema },
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
          categoryId: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: { tableName: 'category', schema }, key: 'id' },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          type: {
            type: Sequelize.ENUM('SET_ASIDE', 'REFILL', 'BALANCE_BY_DATE'),
            allowNull: false,
          },
          amount: {
            type: Sequelize.DECIMAL(20, 5),
            allowNull: false,
            defaultValue: 0,
          },
          // BALANCE_BY_DATE 用：到期月 1 號（YYYY-MM-01）。其餘 type 為 null
          dueDate: {
            type: Sequelize.DATEONLY,
            allowNull: true,
            defaultValue: null,
          },
          createdAt: { allowNull: false, type: Sequelize.DATE },
          updatedAt: { allowNull: false, type: Sequelize.DATE },
        },
        opt,
      );

      // UNIQUE(userId, categoryId) — 每使用者每分類至多一個 target（upsert 錨點）
      await queryInterface.addIndex(
        { tableName: 'budget_target', schema },
        {
          unique: true,
          fields: ['userId', 'categoryId'],
          name: 'budget_target_user_cat_uniq',
          transaction: t,
        },
      );
    });
  },

  async down(queryInterface, Sequelize) {
    const schema = 'accounting';

    await queryInterface.sequelize.transaction(async (t) => {
      const opt = { transaction: t };
      await queryInterface.dropTable({ tableName: 'budget_target', schema }, opt);
      // dropTable 不會移除 Sequelize 為 ENUM 建立的型別，手動清掉避免 down/up 撞名
      await queryInterface.sequelize.query(
        `DROP TYPE IF EXISTS "${schema}"."enum_budget_target_type"`,
        opt,
      );
    });
  },
};
