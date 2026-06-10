import { Request, Response } from 'express';
import { simplifyTryCatch, responseHelper } from '@/utils/common';
import { StatusCodes } from 'http-status-codes';
import { Currency } from '@/models';
import { getRate } from '@/services/exchangeRateService';

// 取得啟用中的幣別清單（供前端下拉；亦可改用 @repo/shared 的 SEED_CURRENCIES）
const getCurrencies = (_req: Request, res: Response) => {
  simplifyTryCatch(_req, res, async () => {
    const currencies = await Currency.findAll({
      where: { isActive: true },
      order: [['code', 'ASC']],
    });
    return res
      .status(StatusCodes.OK)
      .json(responseHelper(true, currencies, 'Get currencies successfully', null));
  });
};

// 查建議匯率（base→quote，指定日期取 <= 該日最近一筆）。供交易表單 / LLM 確認預填。
const getSuggestedRate = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const base = String(req.query.base || '');
    const quote = String(req.query.quote || '');
    const date = req.query.date ? String(req.query.date) : undefined;
    if (!base || !quote) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(responseHelper(false, null, 'base 與 quote 為必填', null));
    }
    const rate = await getRate(base, quote, date);
    return res
      .status(StatusCodes.OK)
      .json(
        responseHelper(
          true,
          { base, quote, date: date ?? null, rate },
          rate == null ? '查無匯率' : 'Get rate successfully',
          null,
        ),
      );
  });
};

export default { getCurrencies, getSuggestedRate };
