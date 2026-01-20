import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import budgetController from '@/controllers/budgetController';
import budgetService from '@/services/budgetService';

// Mock budget service
vi.mock('@/services/budgetService', () => ({
  default: {
    getAllBudgetsWithUsage: vi.fn(),
    getBudgetWithUsage: vi.fn(),
    createBudget: vi.fn(),
    updateBudget: vi.fn(),
    deleteBudget: vi.fn(),
  },
}));

// Mock utils
vi.mock('@/utils/common', () => ({
  simplifyTryCatch: async (req: any, res: any, fn: any) => {
    try {
      await fn();
    } catch (error) {
      res.status(500).json({ error });
    }
  },
  responseHelper: (
    isSuccess: boolean,
    data: any,
    message: string,
    error: any,
  ) => ({
    isSuccess,
    data,
    message,
    error,
  }),
}));

const mockRequest = () => {
  return {
    user: { userId: 'user-123' },
    body: {},
    params: {},
  } as unknown as Request;
};

const mockResponse = () => {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe('Budget Controller (Mocked)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllBudgets', () => {
    it('should return all budgets with usage', async () => {
      const mockBudgets = [
        {
          id: 'budget-1',
          name: '月薪預算',
          amount: 30000,
          usage: {
            spent: 15000,
            available: 30000,
            remaining: 15000,
            usageRate: 50,
          },
        },
      ];
      (budgetService.getAllBudgetsWithUsage as any).mockResolvedValue(
        mockBudgets,
      );

      const req = mockRequest();
      const res = mockResponse();

      await budgetController.getAllBudgets(req, res);

      expect(budgetService.getAllBudgetsWithUsage).toHaveBeenCalledWith(
        'user-123',
      );
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          isSuccess: true,
          data: mockBudgets,
        }),
      );
    });
  });

  describe('getBudgetById', () => {
    it('should return budget with usage', async () => {
      const mockBudget = {
        id: 'budget-1',
        name: '月薪預算',
        usage: {
          spent: 15000,
          available: 30000,
          remaining: 15000,
          usageRate: 50,
        },
      };
      (budgetService.getBudgetWithUsage as any).mockResolvedValue(mockBudget);

      const req = mockRequest();
      req.params.id = 'budget-1';
      const res = mockResponse();

      await budgetController.getBudgetById(req, res);

      expect(budgetService.getBudgetWithUsage).toHaveBeenCalledWith(
        'budget-1',
        'user-123',
      );
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });

    it('should return 404 if budget not found', async () => {
      (budgetService.getBudgetWithUsage as any).mockResolvedValue(null);

      const req = mockRequest();
      req.params.id = 'non-existent';
      const res = mockResponse();

      await budgetController.getBudgetById(req, res);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
    });
  });

  describe('createBudget', () => {
    it('should create a budget', async () => {
      const newBudget = {
        id: 'budget-new',
        name: '新預算',
        amount: 50000,
      };
      (budgetService.createBudget as any).mockResolvedValue(newBudget);

      const req = mockRequest();
      req.body = {
        name: '新預算',
        amount: 50000,
        cycleType: 'MONTH',
        cycleStartDay: 1,
        startDate: '2026-01-01',
      };
      const res = mockResponse();

      await budgetController.createBudget(req, res);

      expect(budgetService.createBudget).toHaveBeenCalledWith(
        'user-123',
        req.body,
      );
      expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
    });
  });

  describe('updateBudget', () => {
    it('should update budget with effectiveFrom', async () => {
      const updatedBudget = { id: 'budget-1', name: '更新預算' };
      (budgetService.updateBudget as any).mockResolvedValue(updatedBudget);

      const req = mockRequest();
      req.params.id = 'budget-1';
      req.body = { name: '更新預算', effectiveFrom: 'immediate' };
      const res = mockResponse();

      await budgetController.updateBudget(req, res);

      expect(budgetService.updateBudget).toHaveBeenCalledWith(
        'budget-1',
        'user-123',
        { name: '更新預算' },
        'immediate',
      );
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });

    it('should return 404 if budget not found', async () => {
      (budgetService.updateBudget as any).mockResolvedValue(null);

      const req = mockRequest();
      req.params.id = 'non-existent';
      req.body = { name: '更新' };
      const res = mockResponse();

      await budgetController.updateBudget(req, res);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
    });
  });

  describe('deleteBudget', () => {
    it('should delete budget', async () => {
      (budgetService.deleteBudget as any).mockResolvedValue(true);

      const req = mockRequest();
      req.params.id = 'budget-1';
      const res = mockResponse();

      await budgetController.deleteBudget(req, res);

      expect(budgetService.deleteBudget).toHaveBeenCalledWith(
        'budget-1',
        'user-123',
      );
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });

    it('should return 404 if budget not found', async () => {
      (budgetService.deleteBudget as any).mockResolvedValue(false);

      const req = mockRequest();
      req.params.id = 'non-existent';
      const res = mockResponse();

      await budgetController.deleteBudget(req, res);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
    });
  });
});
