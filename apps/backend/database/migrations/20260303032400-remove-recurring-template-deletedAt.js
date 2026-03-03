'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // 1. 移除 deletedAt 欄位（若存在）
    await queryInterface.sequelize.query(`
      ALTER TABLE "accounting"."recurring_template"
        DROP COLUMN IF EXISTS "deletedAt";
    `);

    // 2. 重建 status enum（移除 PAUSED / CANCELLED，新增 COMPLETED）
    //    先檢查 enum 值是否已經正確，若已正確就跳過
    const [enumValues] = await queryInterface.sequelize.query(`
      SELECT e.enumlabel FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE t.typname = 'enum_recurring_template_status' AND n.nspname = 'accounting'
      ORDER BY e.enumsortorder;
    `);
    const labels = enumValues.map((r) => r.enumlabel);
    const needsRebuild =
      labels.includes('PAUSED') ||
      labels.includes('CANCELLED') ||
      !labels.includes('COMPLETED');

    if (needsRebuild) {
      await queryInterface.sequelize.query(`
        ALTER TABLE "accounting"."recurring_template"
          ALTER COLUMN "status" DROP DEFAULT;
      `);
      await queryInterface.sequelize.query(`
        DROP TYPE IF EXISTS "accounting"."enum_recurring_template_status_old" CASCADE;
      `);
      await queryInterface.sequelize.query(`
        ALTER TYPE "accounting"."enum_recurring_template_status"
          RENAME TO "enum_recurring_template_status_old";
      `);
      await queryInterface.sequelize.query(`
        CREATE TYPE "accounting"."enum_recurring_template_status"
          AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');
      `);
      await queryInterface.sequelize.query(`
        ALTER TABLE "accounting"."recurring_template"
          ALTER COLUMN "status" TYPE "accounting"."enum_recurring_template_status"
          USING "status"::text::"accounting"."enum_recurring_template_status";
      `);
      await queryInterface.sequelize.query(`
        ALTER TABLE "accounting"."recurring_template"
          ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"accounting"."enum_recurring_template_status";
      `);
      await queryInterface.sequelize.query(`
        DROP TYPE IF EXISTS "accounting"."enum_recurring_template_status_old";
      `);
    }
  },

  async down(queryInterface, Sequelize) {
    // 1. 還原 status enum
    await queryInterface.sequelize.query(`
      ALTER TYPE "accounting"."enum_recurring_template_status"
        RENAME TO "enum_recurring_template_status_old";
    `);
    await queryInterface.sequelize.query(`
      CREATE TYPE "accounting"."enum_recurring_template_status"
        AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED', 'ARCHIVED');
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE "accounting"."recurring_template"
        ALTER COLUMN "status" TYPE "accounting"."enum_recurring_template_status"
        USING "status"::text::"accounting"."enum_recurring_template_status";
    `);
    await queryInterface.sequelize.query(`
      DROP TYPE "accounting"."enum_recurring_template_status_old";
    `);

    // 2. 還原 deletedAt 欄位
    await queryInterface.addColumn(
      { tableName: 'recurring_template', schema: 'accounting' },
      'deletedAt',
      {
        allowNull: true,
        type: Sequelize.DATE,
      },
    );
  },
};
