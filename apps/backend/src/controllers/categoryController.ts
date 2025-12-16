import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import Category from '@/models/category';
import { simplifyTryCatch, responseHelper } from '@/utils/common';
import { CategoryType } from '@repo/shared';
import { Op } from 'sequelize';

const getAllCategories = async (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const myId = req.user.userId;
    // 取出預設和自己擁有的 Category
    const categories = await Category.findAll({
      where: {
        [Op.or]: [{ userId: myId }, { userId: null }],
      },
      order: [['createdAt', 'DESC']],
    });

    // 適合用於找尋 key: value 的資料結構，尤其是每個物件包都有個 id 的情況下，透過 Map 底層的 O(1) 時間複雜度比起傳統物件來說會非常快。
    const categoryMap = new Map<string, CategoryType>();
    const rootNodes: CategoryType[] = [];

    // 整理每個 Category 的 key: value 到 Map 中。
    categories.forEach((catModel) => {
      const cat = catModel.toJSON() as any;
      const node: CategoryType = {
        id: cat.id,
        name: cat.name,
        type: cat.type,
        icon: cat.icon,
        color: cat.color,
        children: [],
        parent: null,
      };

      (node as any).parentId = cat.parentId; // 下一步才會來找 parent，目前先儲存 parentId

      categoryMap.set(node.id, node);
    });

    // 分層
    categoryMap.forEach((node) => {
      const parentId = (node as any).parentId;
      if (parentId && categoryMap.has(parentId)) {
        const parent = categoryMap.get(parentId)!; // !: 100% 確定有值
        parent.children.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    res
      .status(StatusCodes.OK)
      .json(
        responseHelper(true, rootNodes, 'Categories fetched successfully', null)
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
};
