'use strict';

/**
 * Rules Engine Phase B：使用者自訂分類規則。
 *  - transaction_rule：條件（description/金額/類型）+ 動作（setCategoryId）。
 *  - transaction_rule_tag：規則 ⇄ 標籤 多對多（動作：套標籤）。
 *
 * 在 accounting schema 下索引/型別一律 schema 限定。ENUM 型別由 createTable 自動建立，
 * down 需顯式 DROP TYPE。
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = 'accounting';
    await queryInterface.sequelize.transaction(async (t) => {
      const opt = { transaction: t };

      await queryInterface.createTable(
        { tableName: 'transaction_rule', schema },
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
          name: { type: Sequelize.STRING, allowNull: true },
          priority: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          isEnabled: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          descriptionMatch: { type: Sequelize.STRING, allowNull: true },
          matchMode: {
            type: Sequelize.ENUM('contains', 'equals', 'starts_with'),
            allowNull: false,
            defaultValue: 'contains',
          },
          amountMin: { type: Sequelize.DECIMAL(20, 5), allowNull: true },
          amountMax: { type: Sequelize.DECIMAL(20, 5), allowNull: true },
          transactionType: {
            type: Sequelize.ENUM('支出', '收入'),
            allowNull: true,
          },
          setCategoryId: {
            type: Sequelize.UUID,
            allowNull: true,
            references: { model: { tableName: 'category', schema }, key: 'id' },
            onDelete: 'SET NULL',
          },
          createdAt: { type: Sequelize.DATE, allowNull: false },
          updatedAt: { type: Sequelize.DATE, allowNull: false },
        },
        opt,
      );

      await queryInterface.addIndex(
        { tableName: 'transaction_rule', schema },
        { fields: ['userId'], name: 'transaction_rule_user_idx', transaction: t },
      );

      await queryInterface.createTable(
        { tableName: 'transaction_rule_tag', schema },
        {
          ruleId: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true,
            references: {
              model: { tableName: 'transaction_rule', schema },
              key: 'id',
            },
            onDelete: 'CASCADE',
          },
          tagId: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true,
            references: { model: { tableName: 'tag', schema }, key: 'id' },
            onDelete: 'CASCADE',
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
      await queryInterface.dropTable(
        { tableName: 'transaction_rule_tag', schema },
        opt,
      );
      await queryInterface.dropTable(
        { tableName: 'transaction_rule', schema },
        opt,
      );
      // createTable 自動建立的 ENUM 型別需顯式移除。
      await queryInterface.sequelize.query(
        `DROP TYPE IF EXISTS "${schema}"."enum_transaction_rule_matchMode"`,
        opt,
      );
      await queryInterface.sequelize.query(
        `DROP TYPE IF EXISTS "${schema}"."enum_transaction_rule_transactionType"`,
        opt,
      );
    });
  },
};
