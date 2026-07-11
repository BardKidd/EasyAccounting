'use strict';

/**
 * Rules Engine Phase A：merchant_mapping 由全域改 per-user + 修跨使用者洩漏。
 *
 * 舊表無 userId：全域 row 的 categoryId 可指向他人私有分類，billParse 會把 A 的
 * categoryId 回傳給 B → 跨使用者資料洩漏（rules-engine-spec R2/R3）。
 *
 *  - 先 DELETE 全部既有 rows（全域眾包資料、低價值、且是洩漏來源；per-user 學習很快重建）。
 *    ⚠️ 破壞性且不可逆：down 無法還原被刪的 rows（僅還原 schema）。
 *  - 加 userId（NOT NULL, FK user, CASCADE）+ isEnabled（BOOLEAN default true）。
 *  - 唯一鍵由 (merchantName, categoryId) 改為 (userId, merchantName, categoryId)。
 *
 * 在 accounting schema 下 removeIndex/removeConstraint 易靜默跳過，索引一律用 schema 限定 raw SQL。
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = 'accounting';
    await queryInterface.sequelize.transaction(async (t) => {
      const opt = { transaction: t };

      // 1. 清空全域 rows（不可逆）——先清才能安全加 NOT NULL userId，且移除洩漏來源。
      await queryInterface.sequelize.query(
        `DELETE FROM "${schema}"."merchant_mapping"`,
        opt,
      );

      // 2. 移除舊 2 欄 unique constraint（原由 addConstraint 建立）。
      await queryInterface.sequelize.query(
        `ALTER TABLE "${schema}"."merchant_mapping"
           DROP CONSTRAINT IF EXISTS "merchant_mapping_merchantName_categoryId_uk"`,
        opt,
      );

      // 3. userId（FK→user，使用者刪除時連帶清）。
      await queryInterface.addColumn(
        { tableName: 'merchant_mapping', schema },
        'userId',
        {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: { tableName: 'user', schema }, key: 'id' },
          onDelete: 'CASCADE',
        },
        opt,
      );

      // 4. isEnabled（使用者可停用某條學到的對應）。
      await queryInterface.addColumn(
        { tableName: 'merchant_mapping', schema },
        'isEnabled',
        {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        opt,
      );

      // 5. 新 3 欄 unique（per-user 隔離）。
      await queryInterface.addIndex(
        { tableName: 'merchant_mapping', schema },
        {
          unique: true,
          fields: ['userId', 'merchantName', 'categoryId'],
          name: 'merchant_mapping_user_merchant_category_uk',
          transaction: t,
        },
      );
    });
  },

  async down(queryInterface, Sequelize) {
    const schema = 'accounting';
    await queryInterface.sequelize.transaction(async (t) => {
      const opt = { transaction: t };

      // ⚠️ up 已刪除所有既有 rows，資料永久遺失；down 僅還原 schema，表維持空。
      await queryInterface.sequelize.query(
        `DROP INDEX IF EXISTS "${schema}"."merchant_mapping_user_merchant_category_uk"`,
        opt,
      );

      await queryInterface.removeColumn(
        { tableName: 'merchant_mapping', schema },
        'isEnabled',
        opt,
      );

      await queryInterface.removeColumn(
        { tableName: 'merchant_mapping', schema },
        'userId',
        opt,
      );

      // 還原舊 2 欄 unique（表已空，無衝突風險）。
      await queryInterface.addConstraint(
        { tableName: 'merchant_mapping', schema },
        {
          fields: ['merchantName', 'categoryId'],
          type: 'unique',
          name: 'merchant_mapping_merchantName_categoryId_uk',
          transaction: t,
        },
      );
    });
  },
};
