import { Op } from 'sequelize';
import { MerchantMapping, Category } from '@/models';
import type {
  UpdateMerchantMappingInput,
  MerchantMappingListItem,
} from '@repo/shared';

// 商家→分類自動對應（merchant_mapping）的管理服務。
// 一律以 userId scope（per-user 隔離，防跨使用者洩漏，rules-engine-spec R2）。
// 不含建立：對應由 billParse 確認流程自動學習累加（R5）。

const escapeLike = (str: string): string => str.replace(/[%_\\]/g, '\\$&');

/**
 * 單一 description 的商家→分類 fallback 查詢（per-user、僅 enabled）。
 * 供 resolveCategorization 在無規則分類時 fallback（R9 步驟 2）。回傳 categoryId 或 null。
 * 比對邏輯與 billParseService.batchSuggestCategories 一致（ILIKE + 雙向包含、matchCount 最高優先）。
 */
export const lookupMerchantCategory = async (
  userId: string,
  description: string | null | undefined,
): Promise<string | null> => {
  if (!description) return null;
  const rows = await MerchantMapping.findAll({
    where: {
      userId,
      isEnabled: true,
      merchantName: { [Op.iLike]: `%${escapeLike(description)}%` },
    },
    order: [['matchCount', 'DESC']],
  });
  const lower = description.toLowerCase();
  const match = rows.find(
    (m: any) =>
      m.merchantName.toLowerCase().includes(lower) ||
      lower.includes(m.merchantName.toLowerCase()),
  );
  return match?.categoryId || null;
};

/**
 * 列出使用者學到的商家→分類對應，夾帶分類顯示資訊。
 * 分類已軟刪時 LEFT JOIN 不命中 → categoryName 等為 null（前端標「已刪除」）。
 */
const listMerchantMappings = async (
  userId: string,
  includeDisabled = false,
): Promise<MerchantMappingListItem[]> => {
  const where: any = { userId };
  if (!includeDisabled) where.isEnabled = true;

  const rows = await MerchantMapping.findAll({
    where,
    include: [
      {
        model: Category,
        as: 'category',
        required: false, // LEFT JOIN；軟刪分類不命中
        attributes: ['id', 'name', 'icon', 'color'],
      },
    ],
    order: [
      ['matchCount', 'DESC'],
      ['merchantName', 'ASC'],
    ],
  });

  return rows.map((row: any) => {
    const cat = row.category;
    return {
      id: row.id,
      merchantName: row.merchantName,
      categoryId: row.categoryId,
      categoryName: cat?.name ?? null,
      categoryIcon: cat?.icon ?? null,
      categoryColor: cat?.color ?? null,
      matchCount: row.matchCount,
      isEnabled: row.isEnabled,
    };
  });
};

/**
 * 更新一條對應：改分類 / 啟停。改分類需驗證分類擁有權（本人或全域預設）。
 * 改分類可能撞新唯一鍵 (userId, merchantName, categoryId) → 回友善錯誤。
 */
const updateMerchantMapping = async (
  userId: string,
  id: string,
  input: UpdateMerchantMappingInput,
) => {
  const mapping = await MerchantMapping.findOne({ where: { id, userId } });
  if (!mapping) throw new Error('對應不存在');

  if (input.categoryId !== undefined) {
    const category = await Category.findOne({
      where: {
        id: input.categoryId,
        [Op.or]: [{ userId }, { userId: null }],
      },
    });
    if (!category) throw new Error('分類不存在或無權限');

    // 撞唯一鍵檢查（同商家已有另一條指向此分類）
    const dup = await MerchantMapping.findOne({
      where: {
        userId,
        merchantName: mapping.merchantName,
        categoryId: input.categoryId,
        id: { [Op.ne]: id },
      },
    });
    if (dup) throw new Error('此商家已有相同分類的對應');

    mapping.categoryId = input.categoryId;
  }

  if (input.isEnabled !== undefined) mapping.isEnabled = input.isEnabled;

  await mapping.save();
  return mapping;
};

/**
 * 刪除一條對應（hard-delete；merchant_mapping paranoid:false）。
 */
const deleteMerchantMapping = async (userId: string, id: string) => {
  const mapping = await MerchantMapping.findOne({ where: { id, userId } });
  if (!mapping) throw new Error('對應不存在');
  await mapping.destroy();
  return { success: true };
};

export default {
  listMerchantMappings,
  updateMerchantMapping,
  deleteMerchantMapping,
};
