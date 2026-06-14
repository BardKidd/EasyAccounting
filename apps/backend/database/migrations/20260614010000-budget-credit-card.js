'use strict';

/**
 * YNAB Phase 2 ④：信用卡完整機制（spec §9 P2-D1）。
 *
 * budget_assignment 擴充以儲存「信用卡付款（CC Payment）信封」的 assigned：
 *  - 加 nullable creditAccountId 判別欄（非新表、非真分類，不污染分類樹）。
 *  - categoryId 改 nullable；CHECK 強制「categoryId / creditAccountId 恰一非空」。
 *  - 移除舊三欄 unique，改兩個 partial unique index（envelope vs ccpay）。
 *
 * 在 accounting schema 下 removeIndex 會靜默跳過，故索引/約束一律用 schema 限定的 raw SQL。
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = 'accounting';
    await queryInterface.sequelize.transaction(async (t) => {
      const opt = { transaction: t };

      // 1. creditAccountId（FK→account，卡刪除時連帶清 CC Payment assignment）
      await queryInterface.addColumn(
        { tableName: 'budget_assignment', schema },
        'creditAccountId',
        {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: { tableName: 'account', schema }, key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        opt,
      );

      // 2. categoryId 改 nullable（CC Payment 列的 categoryId 為 null）
      await queryInterface.sequelize.query(
        `ALTER TABLE "${schema}"."budget_assignment" ALTER COLUMN "categoryId" DROP NOT NULL`,
        opt,
      );

      // 3. 移除舊三欄 unique
      await queryInterface.sequelize.query(
        `DROP INDEX IF EXISTS "${schema}"."budget_assignment_user_cat_month_uniq"`,
        opt,
      );

      // 4. 兩個 partial unique index
      await queryInterface.sequelize.query(
        `CREATE UNIQUE INDEX "budget_assignment_envelope_uniq"
           ON "${schema}"."budget_assignment" ("userId","categoryId","month")
           WHERE "creditAccountId" IS NULL`,
        opt,
      );
      await queryInterface.sequelize.query(
        `CREATE UNIQUE INDEX "budget_assignment_ccpay_uniq"
           ON "${schema}"."budget_assignment" ("userId","creditAccountId","month")
           WHERE "creditAccountId" IS NOT NULL`,
        opt,
      );

      // 5. CHECK：categoryId / creditAccountId 恰一非空
      await queryInterface.sequelize.query(
        `ALTER TABLE "${schema}"."budget_assignment"
           ADD CONSTRAINT "budget_assignment_discriminator_chk"
           CHECK (
             ("categoryId" IS NOT NULL AND "creditAccountId" IS NULL)
             OR ("categoryId" IS NULL AND "creditAccountId" IS NOT NULL)
           )`,
        opt,
      );
    });
  },

  async down(queryInterface, Sequelize) {
    const schema = 'accounting';
    await queryInterface.sequelize.transaction(async (t) => {
      const opt = { transaction: t };

      // 先刪 CC Payment 列（categoryId 為 null），才能還原 categoryId NOT NULL
      await queryInterface.sequelize.query(
        `DELETE FROM "${schema}"."budget_assignment" WHERE "creditAccountId" IS NOT NULL`,
        opt,
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE "${schema}"."budget_assignment" DROP CONSTRAINT IF EXISTS "budget_assignment_discriminator_chk"`,
        opt,
      );
      await queryInterface.sequelize.query(
        `DROP INDEX IF EXISTS "${schema}"."budget_assignment_envelope_uniq"`,
        opt,
      );
      await queryInterface.sequelize.query(
        `DROP INDEX IF EXISTS "${schema}"."budget_assignment_ccpay_uniq"`,
        opt,
      );
      // 還原舊三欄 unique
      await queryInterface.sequelize.query(
        `CREATE UNIQUE INDEX "budget_assignment_user_cat_month_uniq"
           ON "${schema}"."budget_assignment" ("userId","categoryId","month")`,
        opt,
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE "${schema}"."budget_assignment" ALTER COLUMN "categoryId" SET NOT NULL`,
        opt,
      );
      await queryInterface.removeColumn(
        { tableName: 'budget_assignment', schema },
        'creditAccountId',
        opt,
      );
    });
  },
};
