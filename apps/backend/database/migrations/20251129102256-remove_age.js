'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn(
      {
        tableName: 'users',
        schema: 'accounting',
      },
      'age'
    );
  },

  async down(queryInterface, Sequelize) {},
};
