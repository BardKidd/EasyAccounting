'use strict';

/**
 * 拆分交易 Phase B：transaction_split 子表 + transaction.isSplit 欄位
 * （spec docs/specs/split-tags-spec.md §5.1/§5.2）。
 *
 * - transaction_split：每筆交易底下的「分類 + 金額」子項。硬刪、無 timestamps
 *   （更新交易時先全刪舊子項再建新）。amount 原幣毛額、amountInBase 本位幣快照。
 * - transaction.isSplit：true 時父為容器、聚合走 view；categoryId 僅列表顯示主分類。
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = 'accounting';

    await queryInterface.sequelize.transaction(async (t) => {
      const opt = { transaction: t };

      await queryInterface.createTable(
        { tableName: 'transaction_split', schema },
        {
          id: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true,
            defaultValue: Sequelize.UUIDV4,
          },
          transactionId: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: { tableName: 'transaction', schema },
              key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          categoryId: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: { tableName: 'category', schema }, key: 'id' },
            onUpdate: 'CASCADE',
          },
          amount: { type: Sequelize.DECIMAL(20, 5), allowNull: false },
          amountInBase: {
            type: Sequelize.DECIMAL(20, 5),
            allowNull: false,
            defaultValue: 0,
          },
          note: { type: Sequelize.STRING, allowNull: true, defaultValue: null },
          sortOrder: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
        },
        opt,
      );

      // view / 聚合會以 transactionId 連回父交易，建索引
      await queryInterface.addIndex(
        { tableName: 'transaction_split', schema },
        {
          fields: ['transactionId'],
          name: 'transaction_split_tx_idx',
          transaction: t,
        },
      );

      await queryInterface.addColumn(
        { tableName: 'transaction', schema },
        'isSplit',
        {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        opt,
      );
    });
  },

  async down(queryInterface, Sequelize) {
    const schema = 'accounting';

    await queryInterface.sequelize.transaction(async (t) => {
      const opt = { transaction: t };
      await queryInterface.removeColumn(
        { tableName: 'transaction', schema },
        'isSplit',
        opt,
      );
      await queryInterface.dropTable(
        { tableName: 'transaction_split', schema },
        opt,
      );
    });
  },
};
