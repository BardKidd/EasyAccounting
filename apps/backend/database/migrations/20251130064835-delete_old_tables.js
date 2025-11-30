'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.dropTable({
      tableName: 'categories',
      schema: 'accounting',
    });
    await queryInterface.dropTable({
      tableName: 'users',
      schema: 'accounting',
    });
  },

  async down(queryInterface, Sequelize) {},
};
