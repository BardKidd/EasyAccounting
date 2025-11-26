import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import Category from '../models/category';
import User from '../models/user';
import { simplifyTryCatch } from '../utils/common';
import { CategoryType } from '@repo/shared';

const getAllCategories = async (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const categories = await Category.findAll({
      include: [
        { model: Category, as: 'children' },
        { model: Category, as: 'parent' },
      ],
    });
    let sortedCategories: CategoryType[] = [];
    if (categories.length > 0) {
      sortedCategories = categories.map((category) => {
        const categoryJson = category.toJSON(); // 從 Model 轉換成 JSON
        return {
          id: categoryJson.id,
          name: categoryJson.name,
          type: categoryJson.type,
          icon: categoryJson.icon,
          color: categoryJson.color,
          children: categoryJson.children,
          parent: categoryJson.parent,
        };
      });
    }
    res.status(StatusCodes.OK).json({
      message: 'Categories fetched successfully',
      data: sortedCategories,
    });
  });
};

const getChildrenCategories = async (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const categoryId = req.params.id;
    const category = (await Category.findByPk(categoryId)) as any;
    if (!category) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Category not found',
      });
    }
    const childrenCategories = await category.getChildren(); // as any 為了不要讓這個 Magic 出來的方法不被 TypeScript 給標記為錯誤

    let sortedCategories: CategoryType[] = [];
    if (childrenCategories.length > 0) {
      sortedCategories = childrenCategories.map((category: any) => {
        const categoryJson = category.toJSON(); // 從 Model 轉換成 JSON
        return {
          id: categoryJson.id,
          name: categoryJson.name,
          type: categoryJson.type,
          icon: categoryJson.icon,
          color: categoryJson.color,
        };
      });
    }
    res.status(StatusCodes.OK).json({
      message: 'Children categories fetched successfully',
      data: sortedCategories,
    });
  });
};

const postCategory = async (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const { userId } = req.body;
    if (userId) {
      const user = await User.findByPk(userId);
      if (user && user.getDataValue('deletedAt')) {
        return res.status(StatusCodes.FORBIDDEN).json({
          message: 'User is deleted',
        });
      }
    }
    await Category.create(req.body);
    res.status(StatusCodes.CREATED).json({
      message: 'Category created successfully',
    });
  });
};

const putCategory = async (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const categoryId = req.params.id;
    const category = await Category.findByPk(categoryId);
    if (!category) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Category not found',
      });
    }
    await category.update(req.body); // 不需要使用 where,因為已經有 category instance 了
    res.status(StatusCodes.OK).json({
      message: 'Category updated successfully',
    });
  });
};

const deleteCategory = async (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const categoryId = req.params.id;
    const category = await Category.findByPk(categoryId);
    if (!category) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Category not found',
      });
    }
    await category.destroy();
    res.status(StatusCodes.OK).json({
      message: 'Category deleted successfully',
    });
  });
};

export default {
  postCategory,
  getAllCategories,
  putCategory,
  deleteCategory,
  getChildrenCategories,
};
