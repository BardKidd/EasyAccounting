'use strict';

/**
 * Category 改為 soft-delete：新增 deletedAt 欄位。
 *
 * 背景（budget-ynab review H2）：原本 Category 為硬刪（paranoid:false），且
 * transaction.categoryId FK 為 onDelete:CASCADE——刪一個有交易的分類會連帶
 * 物理刪除其全部交易（資料遺失），且預算 §9 要求保留已刪分類的歷史信封並標註
 * 「（已刪除）」無法達成。改 soft-delete 後 DB CASCADE 不再觸發，交易得以保留，
 * 已刪分類仍可被 paranoid:false 查回並讀 deletedAt 標註。
 *
 * 子分類的連帶刪除改由 models/index.ts 的 Category.afterDestroy hook 串接。
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = 'accounting';
    await queryInterface.addColumn(
      { tableName: 'category', schema },
      'deletedAt',
      {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
      },
    );
  },

  async down(queryInterface) {
    const schema = 'accounting';
    await queryInterface.removeColumn(
      { tableName: 'category', schema },
      'deletedAt',
    );
  },
};
