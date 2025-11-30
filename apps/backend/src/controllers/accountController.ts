import { Request, Response } from 'express';
import { simplifyTryCatch } from '../utils/common';
import Account from '../models/account';
import { StatusCodes } from 'http-status-codes';

const getAccountsByUser = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const accounts = await Account.findAll({
      where: {
        userId: req.params.userId,
      },
    });
    return res.status(StatusCodes.OK).json(accounts);
  });
};

const addAccount = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const account = await Account.create(req.body);
    return res.status(StatusCodes.CREATED).json(account);
  });
};

const editAccount = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    await Account.update(req.body, {
      where: {
        id: req.params.accountId,
      },
    });
    return res.status(StatusCodes.OK).json({
      message: '該帳戶已更新',
    });
  });
};

const deleteAccount = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    await Account.destroy({
      where: {
        id: req.params.accountId,
      },
    });
    return res.status(StatusCodes.OK).json({
      message: '該帳戶已刪除',
    });
  });
};

export default {
  getAccountsByUser,
  addAccount,
  editAccount,
  deleteAccount,
};
