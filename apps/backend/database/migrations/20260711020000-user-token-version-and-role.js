'use strict';

/**
 * 安全性強化：
 *  - tokenVersion（#8）：session 版本號。改密碼/重設時 +1，authMiddleware 於
 *    refresh 換證時比對，使既有 refresh token 立即失效（關閉「改密碼後舊 session
 *    仍存活 7 天」的窗口）。
 *  - role（#9）：權限角色（'user' | 'admin'）。管理端點（如公告增改刪）需 admin。
 *
 * 兩欄皆 NOT NULL + 預設值，對既有 rows 安全（tokenVersion 0 / role 'user'）。
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = 'accounting';
    await queryInterface.sequelize.transaction(async (t) => {
      const opt = { transaction: t };

      await queryInterface.addColumn(
        { tableName: 'user', schema },
        'tokenVersion',
        {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        opt,
      );

      await queryInterface.addColumn(
        { tableName: 'user', schema },
        'role',
        {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'user',
        },
        opt,
      );
    });
  },

  async down(queryInterface, Sequelize) {
    const schema = 'accounting';
    await queryInterface.sequelize.transaction(async (t) => {
      const opt = { transaction: t };

      await queryInterface.removeColumn({ tableName: 'user', schema }, 'role', opt);
      await queryInterface.removeColumn(
        { tableName: 'user', schema },
        'tokenVersion',
        opt,
      );
    });
  },
};
