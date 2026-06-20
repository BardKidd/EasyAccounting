import { Op } from 'sequelize';
import sequelize from '@/utils/postgres';
import { Tag } from '@/models';
import type { CreateTagInput, UpdateTagInput } from '@repo/shared';
import { AuditAction, AuditEntityType } from '@repo/shared';
import {
  recordAudit,
  genericAuditSummary,
  safeSnapshot,
} from '@/services/auditLogService';

const DEFAULT_TAG_COLOR = '#6b7280';

const TAG_ATTRS = ['id', 'userId', 'name', 'color', 'groupName', 'isArchived'];

const listTags = async (userId: string, includeArchived = false) => {
  const where: any = { userId };
  if (!includeArchived) where.isArchived = false;
  return Tag.findAll({
    where,
    attributes: TAG_ATTRS,
    order: [['name', 'ASC']],
  });
};

/**
 * 建立標籤。同名（不分大小寫）已存在 → 回傳既有那筆，讓前端「on-the-fly 建立」具冪等性，
 * 不會因重複名稱噴 unique 錯。
 */
const createTag = async (userId: string, input: CreateTagInput) => {
  const name = input.name.trim();
  const existing = await Tag.findOne({
    where: { userId, name: { [Op.iLike]: name } },
    attributes: TAG_ATTRS,
  });
  if (existing) return existing;

  const created = await Tag.create({
    userId,
    name,
    color: input.color || DEFAULT_TAG_COLOR,
    groupName: input.groupName ?? null,
  });

  void recordAudit({
    userId,
    action: AuditAction.CREATE,
    entityType: AuditEntityType.TAG,
    entityId: created.id,
    after: safeSnapshot(created),
    summary: genericAuditSummary(AuditAction.CREATE, AuditEntityType.TAG, name),
  });

  return created;
};

const updateTag = async (
  userId: string,
  id: string,
  input: UpdateTagInput,
) => {
  const tag = await Tag.findOne({ where: { id, userId } });
  if (!tag) throw new Error('標籤不存在');
  const auditBefore = safeSnapshot(tag);

  if (input.name !== undefined) {
    const name = input.name.trim();
    const dup = await Tag.findOne({
      where: { userId, name: { [Op.iLike]: name }, id: { [Op.ne]: id } },
    });
    if (dup) throw new Error('已有同名標籤');
    tag.name = name;
  }
  if (input.color !== undefined) tag.color = input.color;
  if (input.groupName !== undefined) tag.groupName = input.groupName;
  if (input.isArchived !== undefined) tag.isArchived = input.isArchived;

  await tag.save();

  void recordAudit({
    userId,
    action: AuditAction.UPDATE,
    entityType: AuditEntityType.TAG,
    entityId: tag.id,
    before: auditBefore,
    after: safeSnapshot(tag),
    summary: genericAuditSummary(
      AuditAction.UPDATE,
      AuditEntityType.TAG,
      tag.name,
    ),
  });

  return tag;
};

/**
 * 刪除標籤（hard-delete）。transaction_tag 關聯由 models/index.ts 的 Tag.afterDestroy
 * 串接清除；交易本身不動。
 */
const deleteTag = async (userId: string, id: string) => {
  let auditBefore: any = null;
  const result = await sequelize.transaction(async (t) => {
    const tag = await Tag.findOne({ where: { id, userId }, transaction: t });
    if (!tag) throw new Error('標籤不存在');
    auditBefore = safeSnapshot(tag);
    await tag.destroy({ transaction: t });
    return { success: true };
  });

  void recordAudit({
    userId,
    action: AuditAction.DELETE,
    entityType: AuditEntityType.TAG,
    entityId: id,
    before: auditBefore,
    summary: genericAuditSummary(
      AuditAction.DELETE,
      AuditEntityType.TAG,
      auditBefore?.name,
    ),
  });

  return result;
};

export default { listTags, createTag, updateTag, deleteTag };
