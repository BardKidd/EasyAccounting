import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import categoryController from '@/controllers/categoryController';
import Category from '@/models/category';

// Mock Category Model
vi.mock('@/models/category', () => ({
  default: {
    findAll: vi.fn(),
    create: vi.fn(),
    findByPk: vi.fn(),
    destroy: vi.fn(),
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
    error: any
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

describe('Category Controller (Mocked)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllCategories', () => {
    it('should return hierarchical categories', async () => {
      const parent = {
        id: 'p1',
        name: 'Parent',
        userId: 'user-123',
        toJSON: () => ({
          id: 'p1',
          name: 'Parent',
          userId: 'user-123',
          parentId: null,
        }),
      };
      const child = {
        id: 'c1',
        name: 'Child',
        userId: 'user-123',
        toJSON: () => ({
          id: 'c1',
          name: 'Child',
          userId: 'user-123',
          parentId: 'p1',
        }),
      };

      (Category.findAll as any).mockResolvedValue([parent, child]);

      const req = mockRequest();
      const res = mockResponse();

      await categoryController.getAllCategories(req, res);

      expect(Category.findAll).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          isSuccess: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              id: 'p1',
              children: expect.arrayContaining([
                expect.objectContaining({ id: 'c1' }),
              ]),
            }),
          ]),
        })
      );
    });
  });

  describe('postCategory', () => {
    it('should create a category', async () => {
      const newCat = { id: 'new', name: 'New Cat', userId: 'user-123' };
      (Category.create as any).mockResolvedValue(newCat);

      const req = mockRequest();
      req.body = { name: 'New Cat' };
      const res = mockResponse();

      await categoryController.postCategory(req, res);

      expect(Category.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Cat', userId: 'user-123' })
      );
      expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ isSuccess: true, data: newCat })
      );
    });
  });

  describe('putCategory', () => {
    it('should update existing category', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({});
      const existingCat = {
        id: 'cat-1',
        update: mockUpdate,
        userId: 'user-123',
      };
      (Category.findByPk as any).mockResolvedValue(existingCat);

      const req = mockRequest();
      req.params.id = 'cat-1';
      req.body = { name: 'Updated' };
      const res = mockResponse();

      await categoryController.putCategory(req, res);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(Category.findByPk).toHaveBeenCalledWith('cat-1');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Updated', userId: 'user-123' })
      );
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });

    it('should return 404 if category not found', async () => {
      (Category.findByPk as any).mockResolvedValue(null);

      const req = mockRequest();
      req.params.id = 'missing';
      const res = mockResponse();

      await categoryController.putCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
    });
  });

  describe('deleteCategory', () => {
    it('should delete user owned category', async () => {
      const mockDestroy = vi.fn().mockResolvedValue({});
      const existingCat = {
        id: 'cat-1',
        userId: 'user-123',
        destroy: mockDestroy,
      };
      (Category.findByPk as any).mockResolvedValue(existingCat);

      const req = mockRequest();
      req.params.id = 'cat-1';
      const res = mockResponse();

      await categoryController.deleteCategory(req, res);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockDestroy).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });

    it('should forbid deleting others category', async () => {
      const existingCat = {
        id: 'cat-1',
        userId: 'other-user',
        destroy: vi.fn(),
      };
      (Category.findByPk as any).mockResolvedValue(existingCat);

      const req = mockRequest();
      req.params.id = 'cat-1';
      const res = mockResponse();

      await categoryController.deleteCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.FORBIDDEN);
      expect(existingCat.destroy).not.toHaveBeenCalled();
    });
  });
});
