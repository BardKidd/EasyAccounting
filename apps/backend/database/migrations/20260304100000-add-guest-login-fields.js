'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = 'accounting';

    // 1. Add isGuest column
    await queryInterface.addColumn({ tableName: 'user', schema }, 'isGuest', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    // 2. Add lastActivityAt column
    await queryInterface.addColumn(
      { tableName: 'user', schema },
      'lastActivityAt',
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
      { tableName: 'user', schema },
      'lastActivityAt',
    );
    await queryInterface.removeColumn({ tableName: 'user', schema }, 'isGuest');
  },
};
