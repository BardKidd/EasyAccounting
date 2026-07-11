import { Request, Response } from 'express';
import { simplifyTryCatch, responseHelper } from '@/utils/common';
import { StatusCodes } from 'http-status-codes';
import transactionRuleServices from '@/services/transactionRuleServices';

// 業務錯誤（規則/分類/標籤不存在或無權限）統一回 400 + responseHelper（沿用 tagController 語意）。
const run = (req: Request, res: Response, cb: () => Promise<void>) => {
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

const listRules = (req: Request, res: Response) => {
  run(req, res, async () => {
    const { userId } = req.user;
    const includeDisabled = (req.query as any).includeDisabled === true;
    const data = await transactionRuleServices.listRules(
      userId,
      includeDisabled,
    );
    res.status(StatusCodes.OK).json(responseHelper(true, data, 'Rules retrieved', null));
  });
};

const createRule = (req: Request, res: Response) => {
  run(req, res, async () => {
    const { userId } = req.user;
    const data = await transactionRuleServices.createRule(userId, req.body);
    res.status(StatusCodes.CREATED).json(responseHelper(true, data, '規則已建立', null));
  });
};

const updateRule = (req: Request, res: Response) => {
  run(req, res, async () => {
    const { userId } = req.user;
    const id = req.params.id!;
    const data = await transactionRuleServices.updateRule(userId, id, req.body);
    res.status(StatusCodes.OK).json(responseHelper(true, data, '規則已更新', null));
  });
};

const deleteRule = (req: Request, res: Response) => {
  run(req, res, async () => {
    const { userId } = req.user;
    const id = req.params.id!;
    await transactionRuleServices.deleteRule(userId, id);
    res.status(StatusCodes.OK).json(responseHelper(true, null, '規則已刪除', null));
  });
};

const reorderRules = (req: Request, res: Response) => {
  run(req, res, async () => {
    const { userId } = req.user;
    await transactionRuleServices.reorderRules(userId, req.body.orderedIds);
    res.status(StatusCodes.OK).json(responseHelper(true, null, '排序已更新', null));
  });
};

export default { listRules, createRule, updateRule, deleteRule, reorderRules };
