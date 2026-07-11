import { Request, Response } from 'express';
import { simplifyTryCatch, responseHelper } from '@/utils/common';
import { StatusCodes } from 'http-status-codes';
import merchantMappingServices from '@/services/merchantMappingServices';

/**
 * 業務錯誤（對應不存在 / 分類無權限 / 撞唯一鍵）統一回 400 + responseHelper，
 * 讓前端讀得到訊息（沿用 tagController 語意）。外層 simplifyTryCatch 兜底 500。
 */
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

const listMerchantMappings = (req: Request, res: Response) => {
  run(req, res, async () => {
    const { userId } = req.user;
    const includeDisabled = (req.query as any).includeDisabled === true;
    const data = await merchantMappingServices.listMerchantMappings(
      userId,
      includeDisabled,
    );
    res
      .status(StatusCodes.OK)
      .json(responseHelper(true, data, 'Merchant mappings retrieved', null));
  });
};

const updateMerchantMapping = (req: Request, res: Response) => {
  run(req, res, async () => {
    const { userId } = req.user;
    const id = req.params.id!;
    const data = await merchantMappingServices.updateMerchantMapping(
      userId,
      id,
      req.body,
    );
    res.status(StatusCodes.OK).json(responseHelper(true, data, '對應已更新', null));
  });
};

const deleteMerchantMapping = (req: Request, res: Response) => {
  run(req, res, async () => {
    const { userId } = req.user;
    const id = req.params.id!;
    await merchantMappingServices.deleteMerchantMapping(userId, id);
    res.status(StatusCodes.OK).json(responseHelper(true, null, '對應已刪除', null));
  });
};

export default {
  listMerchantMappings,
  updateMerchantMapping,
  deleteMerchantMapping,
};
