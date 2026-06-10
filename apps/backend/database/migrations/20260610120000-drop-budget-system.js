'use strict';

/**
 * 拆除舊預算系統（YNAB 重做 Phase 0，見 docs/specs/budget-ynab-spec.md）。
 * 依 FK 依賴順序 drop；down 直接重跑原建表 migration 以維持可逆。
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const schema = 'accounting';
    await queryInterface.sequelize.transaction(async (transaction) => {
      for (const tableName of [
        'transaction_budget',
        'budget_period_snapshot',
        'budget_category',
        'budget',
      ]) {
        await queryInterface.dropTable(
          { tableName, schema },
          { transaction, cascade: true },
        );
      }
    });
  },

  async down(queryInterface, Sequelize) {
    const createBudgetSystem = require('./20260119133000-create-budget-system');
    await createBudgetSystem.up(queryInterface, Sequelize);
  },
};
