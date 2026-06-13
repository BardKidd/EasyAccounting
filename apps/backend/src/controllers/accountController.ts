import { Request, Response } from 'express';
import { simplifyTryCatch, responseHelper } from '@/utils/common';
import Account from '@/models/account';
import CreditCardDetail from '@/models/CreditCardDetail';
import sequelize from '@/utils/postgres';
import { StatusCodes } from 'http-status-codes';
import { Account as AccountEnum } from '@repo/shared';
import {
  deleteTemplatesByAccountId,
  archiveTemplatesByAccountId,
} from '@/services/recurringTemplateService';

const getAccountsByUser = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const { userId } = req.user;
    const { showArchived } = req.query;

    const includeOptions: any[] = [
      {
        model: CreditCardDetail,
        as: 'credit_card_detail',
        required: false,
      },
    ];

    // 建立查詢條件
    const whereClause: any = { userId };

    // 預設行為：除非特別要求 (showArchived=true)，否則不顯示已封存的項目。
    if (showArchived !== 'true') {
      whereClause.isArchived = false;
    }

    const accounts = await Account.findAll({
      where: whereClause,
      include: includeOptions,
      order: [['createdAt', 'ASC']],
    });

    const filteredAccounts = accounts;

    const accountsData = filteredAccounts.map((account) => {
      const plain = account.toJSON() as any;
      return {
        ...plain,
        balance: Number(account.balance),
        // Flatten creditCardDetail if needed or keep nested?
        // Shared type has `creditCardDetail` property.
        creditCardDetail: plain.credit_card_detail
          ? {
              ...plain.credit_card_detail,
              creditLimit: Number(plain.credit_card_detail.creditLimit),
            }
          : undefined,
      };
    });
    return res
      .status(StatusCodes.OK)
      .json(
        responseHelper(true, accountsData, 'Get accounts successfully', null),
      );
  });
};

// onBudget 未指定時依帳戶類型預設（與 budget phase1 migration 回填語意一致）
const defaultOnBudget = (type: string) =>
  type === AccountEnum.CASH ||
  type === AccountEnum.BANK ||
  type === AccountEnum.CREDIT_CARD;

const addAccount = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const { userId } = req.user;
    const data = {
      ...req.body,
      onBudget: req.body.onBudget ?? defaultOnBudget(req.body.type),
      userId,
    };

    const t = await sequelize.transaction();
    try {
      const account = await Account.create(data, { transaction: t });

      if (data.type === AccountEnum.CREDIT_CARD && req.body.creditCardDetail) {
        await CreditCardDetail.create(
          {
            ...req.body.creditCardDetail,
            accountId: account.id,
          },
          { transaction: t },
        );
      }

      await t.commit();

      // Reload to get association
      const reloadedAccount = await Account.findByPk(account.id, {
        include: [{ model: CreditCardDetail, as: 'credit_card_detail' }],
      });

      return res
        .status(StatusCodes.CREATED)
        .json(
          responseHelper(
            true,
            reloadedAccount,
            'Account created successfully',
            null,
          ),
        );
    } catch (error) {
      await t.rollback();
      throw error;
    }
  });
};

const editAccount = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const { userId } = req.user;
    const accountId = req.params.accountId;
    const data = {
      ...req.body,
      userId,
    };

    const t = await sequelize.transaction();
    try {
      await Account.update(data, {
        where: {
          id: accountId,
        },
        transaction: t,
      });

      if (data.type === AccountEnum.CREDIT_CARD && req.body.creditCardDetail) {
        const existing = await CreditCardDetail.findOne({
          where: { accountId },
          transaction: t,
        });
        if (existing) {
          await CreditCardDetail.update(req.body.creditCardDetail, {
            where: { accountId },
            transaction: t,
          });
        } else {
          await CreditCardDetail.create(
            {
              ...req.body.creditCardDetail,
              accountId,
            },
            { transaction: t },
          );
        }
      }
      await t.commit();

      return res
        .status(StatusCodes.OK)
        .json(responseHelper(true, null, '該帳戶已更新', null));
    } catch (err) {
      await t.rollback();
      throw err;
    }
  });
};

const deleteAccount = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const { userId } = req.user;
    const accountId = req.params.accountId as string;

    const t = await sequelize.transaction();
    try {
      // 先刪除所有關聯的 ACTIVE/ARCHIVED templates
      await deleteTemplatesByAccountId(accountId, userId, t);

      await Account.destroy({
        where: { id: accountId, userId },
        transaction: t,
        individualHooks: true,
      });
      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }

    return res
      .status(StatusCodes.OK)
      .json(responseHelper(true, null, '該帳戶已刪除', null));
  });
};

const archiveAccount = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const { userId } = req.user;
    const accountId = req.params.accountId as string;

    const t = await sequelize.transaction();
    try {
      await Account.update(
        { isArchived: true },
        { where: { id: accountId, userId }, transaction: t },
      );

      // 將所有 ACTIVE templates 設為 ARCHIVED
      await archiveTemplatesByAccountId(accountId, userId, t);

      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }

    return res
      .status(StatusCodes.OK)
      .json(responseHelper(true, null, '該帳戶已封存', null));
  });
};

const unarchiveAccount = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const { userId } = req.user;
    const accountId = req.params.accountId as string;

    await Account.update(
      { isArchived: false },
      { where: { id: accountId, userId } },
    );

    return res
      .status(StatusCodes.OK)
      .json(
        responseHelper(
          true,
          null,
          '該帳戶已解除封存，週期交易規則需手動重啟',
          null,
        ),
      );
  });
};

export default {
  getAccountsByUser,
  addAccount,
  editAccount,
  deleteAccount,
  archiveAccount,
  unarchiveAccount,
};
