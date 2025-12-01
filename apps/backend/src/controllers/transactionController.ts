import { Request, Response } from 'express';
import { simplifyTryCatch, responseHelper } from '../utils/common';
import Transaction from '../models/transaction';
import { StatusCodes } from 'http-status-codes';
import transactionServices from '../services/transactionServices';

const createTransaction = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const result = await transactionServices.createTransaction(req.body);

    return res
      .status(StatusCodes.CREATED)
      .json(
        responseHelper(true, result, 'Create transaction successfully', null)
      );
  });
};

const getTransactionsByDate = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const result = await Transaction.findAll({
      where: {
        ...req.body,
        date: req.params.date,
      },
    });

    return res
      .status(StatusCodes.OK)
      .json(
        responseHelper(true, result, 'Get transactions successfully', null)
      );
  });
};

export default {
  createTransaction,
  getTransactionsByDate,
};
