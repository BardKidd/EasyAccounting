import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { simplifyTryCatch, responseHelper } from '@/utils/common';
import Account from '@/models/account';
import Transaction from '@/models/transaction';
import CreditCardDetail from '@/models/CreditCardDetail';
import { Op } from 'sequelize';
import { RootType, Account as AccountEnum } from '@repo/shared';
import sequelize from '@/utils/postgres';

import {
  getDate,
  subMonths,
  format,
  setDate,
  addDays,
  addMonths,
} from 'date-fns';

/**
 * GET /api/notifications/reconciliation
 * 取得需要對帳的通知
 * 條件: 今天 >= 結帳日 (Statement Date) 且有未核對的消費支出
 */
const getReconciliationNotifications = async (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const userId = req.user.userId;
    const today = new Date();
    const currentDay = getDate(today);

    // 1. 取得所有屬於該 User 的 Credit Card Account
    const creditCards = await Account.findAll({
      where: { userId, type: AccountEnum.CREDIT_CARD },
      include: [
        {
          model: CreditCardDetail,
          as: 'credit_card_detail',
          required: true,
        },
      ],
    });

    const notifications: any[] = [];

    // 2. 遍歷每張卡，檢查是否需要對帳
    for (const card of creditCards) {
      if (!card.credit_card_detail) continue;

      const statementDay = card.credit_card_detail.statementDate;

      // 簡單判斷: 今天是否已經過了本月的結帳日?
      // 假設結帳日是 5號, 今天是 6號 -> 需要對帳 1/5 以前的帳單
      // 若今天是 4號 -> 不需要, 還沒結帳

      // 注意: 這裡只是一個 Trigger，真正的區間篩選會在 getReconciliationData 做
      // 只要今天 >= statementDay，就代表本期帳單理論上已出

      // 但我們還需要檢查「是否有未核對的交易」
      // 查找: billingDate <= 本月結帳日 AND accountId = card.id AND isReconciled = false AND type = EXPENSE

      // 計算本期結帳日完整日期
      let statementDate = setDate(today, statementDay);
      if (currentDay < statementDay) {
        // 今天是 4號, 結帳日 5號 -> 但上個月的帳單可能還沒對?
        // 這裡策略: 只要有未核對且過期的交易就通知
        statementDate = subMonths(statementDate, 1);
      }

      // 檢查是否有未核對交易
      const unreconciledCount = await Transaction.count({
        where: {
          userId,
          accountId: card.id,
          type: RootType.EXPENSE,
          isReconciled: false,
          billingDate: {
            [Op.lte]: format(statementDate, 'yyyy-MM-dd'),
          },
        },
      });

      if (unreconciledCount > 0) {
        notifications.push({
          accountId: card.id,
          accountName: card.name,
          statementDate: format(statementDate, 'yyyy-MM-dd'),
          unreconciledCount,
          message: `${card.name}: ${format(statementDate, 'M/d')} 結帳日已過，有 ${unreconciledCount} 筆交易待核對`,
        });
      }
    }

    res
      .status(StatusCodes.OK)
      .json(responseHelper(true, notifications, 'Success', null));
  });
};

/**
 * GET /api/reconciliation/:accountId
 * 取得該帳戶本期(或上期)的待核對資料
 */
const getReconciliationData = async (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const { accountId } = req.params;
    const userId = req.user.userId;

    const account = await Account.findOne({
      where: { id: accountId, userId },
      include: [{ model: CreditCardDetail, as: 'credit_card_detail' }],
    });

    if (!account || !account.credit_card_detail) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(responseHelper(false, null, 'Customer not found', null));
    }

    const statementDay = account.credit_card_detail.statementDate;
    const today = new Date();
    const currentDay = getDate(today);

    // 決定「本期」的截止日
    // 如果今天(14號) >= 結帳日(5號) -> 截止日就是 本月5號
    // 如果今天(4號) < 結帳日(5號) -> 顯示 上個月5號 以前的 (若還有未核對)
    let cutoffDate = setDate(today, statementDay);
    if (currentDay < statementDay) {
      cutoffDate = subMonths(cutoffDate, 1);
    }

    // 查詢未核對交易
    const transactions = await Transaction.findAll({
      where: {
        userId,
        accountId,
        isReconciled: false,
        billingDate: {
          [Op.lte]: format(cutoffDate, 'yyyy-MM-dd'),
        },
      },
      order: [['date', 'ASC']],
    });

    // 為了顯示方便，也回傳區間資訊
    // 上期結帳日+1 ~ 本期結帳日
    const startDate = addDays(subMonths(cutoffDate, 1), 1);

    const data = {
      accountId,
      period: {
        start: format(startDate, 'yyyy-MM-dd'),
        end: format(cutoffDate, 'yyyy-MM-dd'),
      },
      transactions,
    };

    res
      .status(StatusCodes.OK)
      .json(responseHelper(true, data, 'Success', null));
  });
};

/**
 * POST /api/reconciliation/:accountId/confirm
 * 確認核對：包含標記已核對 & 延後交易
 */
const confirmReconciliation = async (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const { accountId } = req.params;
    const { confirmedTransactionIds, deferredTransactionIds } = req.body;
    const userId = req.user.userId;

    // 取得帳戶資訊以計算下期帳單日
    const account = await Account.findOne({
      where: { id: accountId, userId },
      include: [{ model: CreditCardDetail, as: 'credit_card_detail' }],
    });

    if (!account || !account.credit_card_detail) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(responseHelper(false, null, 'Account not found', null));
    }

    // 計算下期結帳日 (為了延後用)
    // 邏輯: 延後到 "下個月的結帳日"。
    // 這樣可以確保該交易會準確地出現在下一期的對帳單中，而不會因為大小月或這期已經過期而再次出現。

    const t = await sequelize.transaction();

    try {
      // 1. 處理已核對 (Confirmed)
      if (confirmedTransactionIds && confirmedTransactionIds.length > 0) {
        await Transaction.update(
          {
            isReconciled: true,
            reconciliationDate: new Date(),
          },
          {
            where: {
              id: { [Op.in]: confirmedTransactionIds },
              userId,
              accountId,
            },
            transaction: t,
          }
        );
      }

      // 2. 處理延後 (Deferred)
      if (deferredTransactionIds && deferredTransactionIds.length > 0) {
        const deferredTxns = await Transaction.findAll({
          where: {
            id: { [Op.in]: deferredTransactionIds },
            userId,
            accountId,
          },
          transaction: t,
        });

        const statementDay = account.credit_card_detail.statementDate;

        for (const txn of deferredTxns) {
          // 計算該交易目前所屬的帳單週期截止日
          const txnBillingDate = new Date(txn.billingDate!);
          let currentCycleEndDate = setDate(txnBillingDate, statementDay);

          // 如果目前 billingDate 的日期 > 結帳日，代表它已經跨到下個月的帳單了
          // E.g. 結帳日 5號, billingDate 20號 -> 它是屬於 下個月5號 的帳單
          if (getDate(txnBillingDate) > statementDay) {
            currentCycleEndDate = addMonths(currentCycleEndDate, 1);
          }

          // 延後目標：推到「下一期」的結帳日
          const nextCycleEndDate = addMonths(currentCycleEndDate, 1);

          await txn.update(
            {
              billingDate: format(nextCycleEndDate, 'yyyy-MM-dd'),
              // 確保 isReconciled 仍為 false (預設)
            },
            { transaction: t }
          );
        }
      }

      await t.commit();
      res
        .status(StatusCodes.OK)
        .json(responseHelper(true, null, 'Reconciliation confirmed', null));
    } catch (error) {
      await t.rollback();
      throw error;
    }
  });
};

export default {
  getReconciliationNotifications,
  getReconciliationData,
  confirmReconciliation,
};
