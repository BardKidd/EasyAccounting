'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. Add isArchived column to account table
      await queryInterface.addColumn(
        { tableName: 'account', schema: 'accounting' },
        'isArchived',
        {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          allowNull: false,
        },
        { transaction }
      );

      // 2. Migrate data from isActive (inverted)
      // isActive = true -> isArchived = false
      // isActive = false -> isArchived = true
      await queryInterface.sequelize.query(
        `UPDATE "accounting"."account" SET "isArchived" = NOT "isActive"`,
        { transaction }
      );

      // 3. Migrate data from credit_card_detail.isArchived
      // If credit_card_detail is archived, the account should be archived
      await queryInterface.sequelize.query(
        `UPDATE "accounting"."account" AS a
         SET "isArchived" = true
         FROM "accounting"."credit_card_detail" AS c
         WHERE a.id = c."accountId" AND c."isArchived" = true`,
        { transaction }
      );

      // 4. Drop isActive column from account table
      await queryInterface.removeColumn(
        { tableName: 'account', schema: 'accounting' },
        'isActive',
        { transaction }
      );

      // 5. Drop isArchived column from credit_card_detail table
      await queryInterface.removeColumn(
        { tableName: 'credit_card_detail', schema: 'accounting' },
        'isArchived',
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Revert steps in reverse order

      // 1. Add isArchived back to credit_card_detail
      await queryInterface.addColumn(
        { tableName: 'credit_card_detail', schema: 'accounting' },
        'isArchived',
        {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          allowNull: false,
        },
        { transaction }
      );

      // Restoring data for CC isArchived is tricky/imperfect as we merged it.
      // We can assume if account is archived and it's a CC, specifically set CC archived?
      // Or just leave it false/true based on mapping.
      // For rollback, let's just restore structure.

      // 2. Add isActive back to account
      await queryInterface.addColumn(
        { tableName: 'account', schema: 'accounting' },
        'isActive',
        {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
          allowNull: false,
        },
        { transaction }
      );

      // 3. Restore data to isActive (inverted from isArchived)
      await queryInterface.sequelize.query(
        `UPDATE "accounting"."account" SET "isActive" = NOT "isArchived"`,
        { transaction }
      );

      // 4. Drop isArchived from account
      await queryInterface.removeColumn(
        { tableName: 'account', schema: 'accounting' },
        'isArchived',
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
