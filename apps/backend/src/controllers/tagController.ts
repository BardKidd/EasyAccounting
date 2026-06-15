import { Request, Response } from 'express';
import { simplifyTryCatch, responseHelper } from '@/utils/common';
import { StatusCodes } from 'http-status-codes';
import tagServices from '@/services/tagServices';

/**
 * Tag service 拋的是業務錯誤（標籤不存在 / 已有同名），統一回 400 + responseHelper
 * 讓前端讀得到訊息（沿用 budgetController.runBudget 語意）。外層 simplifyTryCatch 兜底 500。
 */
const runTag = (req: Request, res: Response, cb: () => Promise<void>) => {
  simplifyTryCatch(req, res, async () => {
    try {
      await cb();
    } catch (err: any) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json(responseHelper(false, null, err?.message || '操作失敗', null));
    }
  });
};

const listTags = (req: Request, res: Response) => {
  runTag(req, res, async () => {
    const { userId } = req.user;
    const includeArchived = (req.query as any).includeArchived === true;
    const data = await tagServices.listTags(userId, includeArchived);
    res
      .status(StatusCodes.OK)
      .json(responseHelper(true, data, 'Tags retrieved', null));
  });
};

const createTag = (req: Request, res: Response) => {
  runTag(req, res, async () => {
    const { userId } = req.user;
    const data = await tagServices.createTag(userId, req.body);
    res
      .status(StatusCodes.CREATED)
      .json(responseHelper(true, data, '標籤已建立', null));
  });
};

const updateTag = (req: Request, res: Response) => {
  runTag(req, res, async () => {
    const { userId } = req.user;
    const id = req.params.id!;
    const data = await tagServices.updateTag(userId, id, req.body);
    res
      .status(StatusCodes.OK)
      .json(responseHelper(true, data, '標籤已更新', null));
  });
};

const deleteTag = (req: Request, res: Response) => {
  runTag(req, res, async () => {
    const { userId } = req.user;
    const id = req.params.id!;
    await tagServices.deleteTag(userId, id);
    res
      .status(StatusCodes.OK)
      .json(responseHelper(true, null, '標籤已刪除', null));
  });
};

export default { listTags, createTag, updateTag, deleteTag };
