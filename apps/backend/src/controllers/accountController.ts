import { Request, Response } from 'express';
import { simplifyTryCatch, responseHelper } from '@/utils/common';
import Account from '@/models/account';
import { StatusCodes } from 'http-status-codes';

const getAccountsByUser = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const { userId } = req.user;
    const accounts = await Account.findAll({
      where: {
        userId,
      },
    });
    const accountsData = accounts.map((account) => {
      return {
        ...account.toJSON(),
        balance: Number(account.balance),
      };
    });
    return res
      .status(StatusCodes.OK)
      .json(
        responseHelper(true, accountsData, 'Get accounts successfully', null)
      );
  });
};

const addAccount = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const { userId } = req.user;
    const data = {
      ...req.body,
      userId,
    };

    const account = await Account.create(data);
    return res
      .status(StatusCodes.CREATED)
      .json(
        responseHelper(true, account, 'Account created successfully', null)
      );
  });
};

const editAccount = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const { userId } = req.user;
    const data = {
      ...req.body,
      userId,
    };
    console.log('data', data);

    await Account.update(data, {
      where: {
        id: req.params.accountId,
      },
    });
    return res
      .status(StatusCodes.OK)
      .json(responseHelper(true, null, '該帳戶已更新', null));
  });
};

const deleteAccount = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const { userId } = req.user;
    await Account.destroy({
      where: {
        id: req.params.accountId,
        userId,
      },
    });
    return res
      .status(StatusCodes.OK)
      .json(responseHelper(true, null, '該帳戶已刪除', null));
  });
};

export default {
  getAccountsByUser,
  addAccount,
  editAccount,
  deleteAccount,
};
