'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 嘗試移除舊的 Foreign Key Constraints (名稱通常是 table_column_fkey)
      // 注意：如果 Constraint 名稱不同，這裡會抱錯，需要進 DB 確認
      try {
        await queryInterface.removeConstraint(
          { tableName: 'category', schema: 'accounting' },
          'category_userId_fkey',
          { transaction }
        );
      } catch (e) {
        console.warn(
          'Constraint category_userId_fkey might not exist or name differs'
        );
      }

      await queryInterface.changeColumn(
        { tableName: 'category', schema: 'accounting' },
        'userId',
        {
          type: Sequelize.UUID,
          references: {
            model: {
              tableName: 'user',
              schema: 'accounting',
            },
            key: 'id',
          },
          allowNull: true,
          onDelete: 'CASCADE',
        },
        { transaction }
      );

      try {
        await queryInterface.removeConstraint(
          { tableName: 'category', schema: 'accounting' },
          'category_parentId_fkey',
          { transaction }
        );
      } catch (e) {
        console.warn(
          'Constraint category_parentId_fkey might not exist or name differs'
        );
      }

      await queryInterface.changeColumn(
        { tableName: 'category', schema: 'accounting' },
        'parentId',
        {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: {
              tableName: 'category',
              schema: 'accounting',
            },
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
        { transaction }
      );

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down(queryInterface, Sequelize) {},
};
