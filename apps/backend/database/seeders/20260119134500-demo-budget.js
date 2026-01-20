'use strict';
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = 'accounting';
    const now = new Date();

    // 1. Find User
    const users = await queryInterface.sequelize.query(
      `SELECT id FROM accounting.user LIMIT 1;`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (users.length === 0) {
      console.log('No users found. Skipping Budget seeder.');
      return;
    }
    const userId = users[0].id;

    // 2. Find some Expense Categories (Leaf nodes usually have parentId not null)
    // We want 'MAIN' or 'SUB' categories.
    // Based on category seeder, 'SUB' categories have a parent which has a parent.
    // 'MAIN' categories have a parent which is ROOT.
    // Let's just pick some categories that are not ROOT.
    const categories = await queryInterface.sequelize.query(
      `SELECT id, name FROM accounting.category WHERE type = 'EXPENSE' AND "parentId" IS NOT NULL LIMIT 5;`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    // 3. Create a Budget
    const budgetId = uuidv4();
    const budgetName = 'Demo Monthly Budget';
    
    // Check if budget already exists to avoid duplicates on re-run
    const existingBudgets = await queryInterface.sequelize.query(
        `SELECT id FROM accounting.budget WHERE name = '${budgetName}' AND "userId" = '${userId}';`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    
    if (existingBudgets.length > 0) {
        console.log('Demo budget already exists. Skipping.');
        return;
    }

    await queryInterface.bulkInsert(
      { schema, tableName: 'budget' },
      [
        {
          id: budgetId,
          userId: userId,
          name: budgetName,
          description: 'A sample budget for demonstration',
          amount: 50000.00,
          cycleType: 'MONTH',
          cycleStartDay: 1,
          startDate: '2026-01-01',
          isRecurring: true,
          rollover: true,
          isActive: true,
          isRecalculating: false,
          createdAt: now,
          updatedAt: now,
        },
      ],
      {}
    );

    // 4. Create BudgetCategories
    if (categories.length > 0) {
      const budgetCategories = categories.map(cat => ({
        id: uuidv4(),
        budgetId: budgetId,
        categoryId: cat.id,
        amount: 1000.00,
        isExcluded: false,
        createdAt: now,
        updatedAt: now
      }));

      await queryInterface.bulkInsert(
        { schema, tableName: 'budget_category' },
        budgetCategories,
        {}
      );
    }
  },

  async down(queryInterface, Sequelize) {
    const schema = 'accounting';
    const budgetName = 'Demo Monthly Budget';
    
    // Find the budget id
     const budgets = await queryInterface.sequelize.query(
        `SELECT id FROM accounting.budget WHERE name = '${budgetName}';`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    
    if (budgets.length > 0) {
        const budgetIds = budgets.map(b => b.id);
        // Delete BudgetCategories
        await queryInterface.bulkDelete(
            { schema, tableName: 'budget_category' },
            { budgetId: budgetIds },
            {}
        );
        // Delete Budget
        await queryInterface.bulkDelete(
            { schema, tableName: 'budget' },
            { id: budgetIds },
            {}
        );
    }
  },
};
