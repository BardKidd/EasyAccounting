'use strict';

/**
 * YNAB Phase 1：budget_assignment 表 + account.onBudget + user.budgetStartMonth + transaction 索引。
 * 見 docs/specs/budget-ynab-spec.md §4。
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = 'accounting';

    await queryInterface.sequelize.transaction(async (t) => {
      const opt = { transaction: t };

      // ---- 1. budget_assignment 表（唯一儲存的預算狀態）----
      await queryInterface.createTable(
        { tableName: 'budget_assignment', schema },
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
          month: {
            type: Sequelize.DATEONLY,
            allowNull: false,
          },
          assigned: {
            type: Sequelize.DECIMAL(20, 5),
            allowNull: false,
            defaultValue: 0,
          },
          createdAt: { allowNull: false, type: Sequelize.DATE },
          updatedAt: { allowNull: false, type: Sequelize.DATE },
        },
        opt,
      );

      // UNIQUE(userId, categoryId, month) — upsert 錨點
      await queryInterface.addIndex(
        { tableName: 'budget_assignment', schema },
        {
          unique: true,
          fields: ['userId', 'categoryId', 'month'],
          name: 'budget_assignment_user_cat_month_uniq',
          transaction: t,
        },
      );

      // INDEX(userId, month) — 月份視圖查詢
      await queryInterface.addIndex(
        { tableName: 'budget_assignment', schema },
        {
          fields: ['userId', 'month'],
          name: 'budget_assignment_user_month_idx',
          transaction: t,
        },
      );

      // ---- 2. account.onBudget ----
      await queryInterface.addColumn(
        { tableName: 'account', schema },
        'onBudget',
        {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        opt,
      );

      // 回填：證券戶/其他 → false，其餘 → true（defaultValue 已處理 true，只需改 false 的）
      await queryInterface.sequelize.query(
        `UPDATE "${schema}"."account" SET "onBudget" = false WHERE "type" IN ('證券戶', '其他')`,
        opt,
      );

      // ---- 3. user.budgetStartMonth ----
      await queryInterface.addColumn(
        { tableName: 'user', schema },
        'budgetStartMonth',
        {
          type: Sequelize.DATEONLY,
          allowNull: true,
          defaultValue: null,
        },
        opt,
      );

      // ---- 4. transaction(userId, date) 索引 ----
      await queryInterface.addIndex(
        { tableName: 'transaction', schema },
        {
          fields: ['userId', 'date'],
          name: 'transaction_user_date_idx',
          transaction: t,
        },
      );
    });
  },

  async down(queryInterface) {
    const schema = 'accounting';

    await queryInterface.sequelize.transaction(async (t) => {
      const opt = { transaction: t };

      // removeIndex 產生的 DROP INDEX 不帶 schema 限定，在 accounting schema 下會
      // 因 IF EXISTS 靜默跳過（索引留存、up/down/up 撞名），故用 raw SQL 指定 schema
      await queryInterface.sequelize.query(
        `DROP INDEX IF EXISTS "${schema}"."transaction_user_date_idx"`,
        opt,
      );

      await queryInterface.removeColumn(
        { tableName: 'user', schema },
        'budgetStartMonth',
        opt,
      );

      await queryInterface.removeColumn(
        { tableName: 'account', schema },
        'onBudget',
        opt,
      );

      await queryInterface.dropTable(
        { tableName: 'budget_assignment', schema },
        opt,
      );
    });
  },
};
