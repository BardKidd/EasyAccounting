import express, { Router } from 'express';
import budgetController from '@/controllers/budgetController';
import budgetCategoryController from '@/controllers/budgetCategoryController';
import { authMiddleware } from '@/middlewares/authMiddleware';

const router: Router = express.Router();

// Budget CRUD
router.get('/budgets', authMiddleware, budgetController.getAllBudgets);
router.get('/budgets/:id', authMiddleware, budgetController.getBudgetById);
router.post('/budgets', authMiddleware, budgetController.createBudget);
router.put('/budgets/:id', authMiddleware, budgetController.updateBudget);
router.delete('/budgets/:id', authMiddleware, budgetController.deleteBudget);

// BudgetCategory CRUD
router.get(
  '/budgets/:id/categories',
  authMiddleware,
  budgetCategoryController.getCategories,
);
router.post(
  '/budgets/:id/categories',
  authMiddleware,
  budgetCategoryController.createCategory,
);
router.put(
  '/budgets/:id/categories/:catId',
  authMiddleware,
  budgetCategoryController.updateCategory,
);
router.delete(
  '/budgets/:id/categories/:catId',
  authMiddleware,
  budgetCategoryController.deleteCategory,
);

export default router;
