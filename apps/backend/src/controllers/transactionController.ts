import { Request, Response } from 'express';
import { simplifyTryCatch, responseHelper } from '@/utils/common';
import Transaction from '@/models/transaction';
import { StatusCodes } from 'http-status-codes';
import transactionServices from '@/services/transactionServices';

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
    const { date } = req.params;
    if (!date) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(responseHelper(false, null, 'Date is required', null));
    }

    const result = await transactionServices.getTransactionsByDate(
      req.body,
      date
    );

    return res
      .status(StatusCodes.OK)
      .json(
        responseHelper(true, result, 'Get transactions successfully', null)
      );
  });
};

const getTransactionById = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const { id } = req.params;
    if (!id) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(responseHelper(false, null, 'Id is required', null));
    }

    const result = await transactionServices.getTransactionById(id);

    return res
      .status(StatusCodes.OK)
      .json(responseHelper(true, result, 'Get transaction successfully', null));
  });
};

export default {
  createTransaction,
  getTransactionsByDate,
  getTransactionById,
};
