import { Op } from 'sequelize';
import sequelize from '@/utils/postgres';
import { TransactionRule, TransactionRuleTag, Category, Tag } from '@/models';
import {
  RuleMatchMode,
  ruleHasCondition,
  ruleHasAction,
  ruleAmountRangeOk,
  type CreateTransactionRuleInput,
  type UpdateTransactionRuleInput,
  type TransactionRuleListItem,
} from '@repo/shared';

// 使用者自訂分類規則的管理服務。一律以 userId scope（per-user 隔離，R6）。

// 分類擁有權：僅本人或全域預設（userId null），且未軟刪。
const assertCategoryOwned = async (
  userId: string,
  categoryId: string,
  t?: any,
) => {
  const cat = await Category.findOne({
    where: { id: categoryId, [Op.or]: [{ userId }, { userId: null }] },
    transaction: t,
  });
  if (!cat) throw new Error('分類不存在或無權限');
};

// 標籤擁有權：全部須為本人 tag。
const assertTagsOwned = async (userId: string, tagIds: string[], t?: any) => {
  if (tagIds.length === 0) return;
  const count = await Tag.count({
    where: { id: { [Op.in]: tagIds }, userId },
    transaction: t,
  });
  if (count !== new Set(tagIds).size) throw new Error('標籤不存在或無權限');
};

const listRules = async (
  userId: string,
  includeDisabled = false,
): Promise<TransactionRuleListItem[]> => {
  const where: any = { userId };
  if (!includeDisabled) where.isEnabled = true;

  const rows = await TransactionRule.findAll({
    where,
    include: [
      {
        model: Category,
        as: 'setCategory',
        required: false, // 軟刪分類不命中 → name null
        attributes: ['id', 'name', 'icon', 'color'],
      },
      {
        model: Tag,
        as: 'tags',
        attributes: ['id', 'name', 'color'],
        through: { attributes: [] },
      },
    ],
    order: [
      ['priority', 'ASC'],
      ['createdAt', 'ASC'],
    ],
  });

  return rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    priority: r.priority,
    isEnabled: r.isEnabled,
    descriptionMatch: r.descriptionMatch,
    matchMode: r.matchMode,
    amountMin: r.amountMin == null ? null : Number(r.amountMin),
    amountMax: r.amountMax == null ? null : Number(r.amountMax),
    transactionType: r.transactionType,
    setCategoryId: r.setCategoryId,
    setCategoryName: r.setCategory?.name ?? null,
    setCategoryIcon: r.setCategory?.icon ?? null,
    setCategoryColor: r.setCategory?.color ?? null,
    tags: (r.tags || []).map((tg: any) => ({
      id: tg.id,
      name: tg.name,
      color: tg.color,
    })),
  }));
};

const createRule = async (
  userId: string,
  input: CreateTransactionRuleInput,
) => {
  return sequelize.transaction(async (t) => {
    if (input.setCategoryId)
      await assertCategoryOwned(userId, input.setCategoryId, t);
    // 去重：TransactionRuleTag 為 (ruleId, tagId) 複合 PK，重複 tagId 會撞唯一鍵。
    const tagIds = [...new Set(input.tagIds ?? [])];
    await assertTagsOwned(userId, tagIds, t);

    const rule = (await TransactionRule.create(
      {
        userId,
        name: input.name ?? null,
        priority: input.priority ?? 0,
        isEnabled: input.isEnabled ?? true,
        descriptionMatch: input.descriptionMatch ?? null,
        matchMode: input.matchMode ?? RuleMatchMode.CONTAINS,
        amountMin: input.amountMin ?? null,
        amountMax: input.amountMax ?? null,
        transactionType: input.transactionType ?? null,
        setCategoryId: input.setCategoryId ?? null,
      } as any,
      { transaction: t },
    )) as any;

    for (const tagId of tagIds) {
      await TransactionRuleTag.create(
        { ruleId: rule.id, tagId } as any,
        { transaction: t },
      );
    }
    return rule;
  });
};

const updateRule = async (
  userId: string,
  id: string,
  input: UpdateTransactionRuleInput,
) => {
  return sequelize.transaction(async (t) => {
    const rule = (await TransactionRule.findOne({
      where: { id, userId },
      transaction: t,
    })) as any;
    if (!rule) throw new Error('規則不存在');

    if (input.setCategoryId !== undefined && input.setCategoryId !== null) {
      await assertCategoryOwned(userId, input.setCategoryId, t);
    }

    // tagIds 有提供才整組取代（append 語意不適用規則動作，改為顯式集合）；去重避免撞複合 PK。
    const dedupedTagIds =
      input.tagIds !== undefined ? [...new Set(input.tagIds)] : undefined;
    if (dedupedTagIds !== undefined)
      await assertTagsOwned(userId, dedupedTagIds, t);

    const fields = [
      'name',
      'priority',
      'isEnabled',
      'descriptionMatch',
      'matchMode',
      'amountMin',
      'amountMax',
      'transactionType',
      'setCategoryId',
    ] as const;
    for (const f of fields) {
      if (input[f] !== undefined) rule[f] = input[f];
    }

    // 部分更新後對「合併結果」重驗規則不變式（共用 create 判定）。
    // 否則 partial PUT（如把所有條件設 null）能繞過驗證，產出無條件規則 → 命中所有交易。
    const currentTagIds =
      dedupedTagIds ??
      (
        await TransactionRuleTag.findAll({
          where: { ruleId: id },
          attributes: ['tagId'],
          transaction: t,
        })
      ).map((rt: any) => rt.tagId);
    const merged = {
      descriptionMatch: rule.descriptionMatch,
      amountMin: rule.amountMin == null ? null : Number(rule.amountMin),
      amountMax: rule.amountMax == null ? null : Number(rule.amountMax),
      transactionType: rule.transactionType,
      setCategoryId: rule.setCategoryId,
      tagIds: currentTagIds,
    };
    if (!ruleHasCondition(merged))
      throw new Error('至少需一個條件（description / 金額 / 類型）');
    if (!ruleHasAction(merged))
      throw new Error('至少需一個動作（套分類 / 套標籤）');
    if (!ruleAmountRangeOk(merged))
      throw new Error('amountMin 不可大於 amountMax');

    await rule.save({ transaction: t });

    if (dedupedTagIds !== undefined) {
      await TransactionRuleTag.destroy({
        where: { ruleId: id },
        transaction: t,
      });
      for (const tagId of dedupedTagIds) {
        await TransactionRuleTag.create(
          { ruleId: id, tagId } as any,
          { transaction: t },
        );
      }
    }
    return rule;
  });
};

const deleteRule = async (userId: string, id: string) => {
  const rule = await TransactionRule.findOne({ where: { id, userId } });
  if (!rule) throw new Error('規則不存在');
  await rule.destroy(); // afterDestroy 清 transaction_rule_tag
  return { success: true };
};

// 批次改 priority：orderedIds 依序給 0,1,2...；只動本人規則。
const reorderRules = async (userId: string, orderedIds: string[]) => {
  return sequelize.transaction(async (t) => {
    const owned = await TransactionRule.findAll({
      where: { id: { [Op.in]: orderedIds }, userId },
      attributes: ['id'],
      transaction: t,
    });
    const ownedIds = new Set(owned.map((r: any) => r.id));
    let i = 0;
    for (const id of orderedIds) {
      if (!ownedIds.has(id)) continue;
      await TransactionRule.update(
        { priority: i },
        { where: { id, userId }, transaction: t },
      );
      i += 1;
    }
    return { success: true };
  });
};

export default {
  listRules,
  createRule,
  updateRule,
  deleteRule,
  reorderRules,
};
