import Category from '@/models/category';
import { CategoryType } from '@repo/shared';
import { Op } from 'sequelize';

interface SimplifyCategory {
  id: string;
  name: string;
  userId: string | null;
  children: SimplifyCategory[];
  parentId: string | null;
  parent: SimplifyCategory | null;
}
const getAllCategoriesHyphenString = async (userId: string) => {
  const categories = await Category.findAll({
    where: {
      [Op.or]: [{ userId }, { userId: null }],
    },
    raw: true,
    order: [['createdAt', 'DESC']],
    attributes: ['id', 'name', 'parentId', 'userId'],
  });

  const categoryMap = new Map<string, SimplifyCategory>();

  categories.forEach((cat) => {
    const node: SimplifyCategory = {
      id: cat.id,
      name: cat.name,
      userId: cat.userId,
      children: [],
      parentId: cat.parentId,
      parent: null,
    };
    categoryMap.set(node.id, node);
  });

  // root > main > sub
  const mainCategories: SimplifyCategory[] = [];
  categoryMap.forEach((node) => {
    if (node.parentId && categoryMap.has(node.parentId)) {
      const parent = categoryMap.get(node.parentId)!;
      parent.children.push(node);
      node.parent = parent;
      mainCategories.push(node);
    }
  });
  const stringCollection: string[] = [];

  mainCategories.forEach((cat) => {
    cat.children.forEach((subCat) => {
      stringCollection.push(`${cat.name} - ${subCat.name}`);
    });
  });

  return stringCollection;
};

export default {
  getAllCategoriesHyphenString,
};
