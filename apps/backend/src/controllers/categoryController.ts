import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import Category from '@/models/category';
import User from '@/models/user';
import { simplifyTryCatch, responseHelper } from '@/utils/common';
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
    res
      .status(StatusCodes.OK)
      .json(
        responseHelper(
          true,
          sortedCategories,
          'Categories fetched successfully',
          null
        )
      );
  });
};

const getChildrenCategories = async (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const categoryId = req.params.id;
    const category = (await Category.findByPk(categoryId)) as any;
    if (!category) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(responseHelper(false, null, 'Category not found', null));
    }
    // getChildren() 是 Sequelize 提供的 Magic Method，可以自動找到關聯的資料
    // 可以去看 app.ts 裡面的 as 命名。假如 as 為 subCategories，這裡就會改為 getSubCategories。
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
    res
      .status(StatusCodes.OK)
      .json(
        responseHelper(
          true,
          sortedCategories,
          'Children categories fetched successfully',
          null
        )
      );
  });
};

const postCategory = async (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    await Category.create(req.body);
    res
      .status(StatusCodes.CREATED)
      .json(responseHelper(true, null, 'Category created successfully', null));
  });
};

const putCategory = async (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const categoryId = req.params.id;
    const category = await Category.findByPk(categoryId);
    if (!category) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(responseHelper(false, null, 'Category not found', null));
    }
    await category.update(req.body); // 不需要使用 where,因為已經有 category instance 了
    res
      .status(StatusCodes.OK)
      .json(responseHelper(true, null, 'Category updated successfully', null));
  });
};

const deleteCategory = async (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const categoryId = req.params.id;
    const category = await Category.findByPk(categoryId);
    if (!category) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(responseHelper(false, null, 'Category not found', null));
    }
    await category.destroy();
    res
      .status(StatusCodes.OK)
      .json(responseHelper(true, null, 'Category deleted successfully', null));
  });
};

export default {
  postCategory,
  getAllCategories,
  putCategory,
  deleteCategory,
  getChildrenCategories,
};
