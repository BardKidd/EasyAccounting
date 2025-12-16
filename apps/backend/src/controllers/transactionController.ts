import { Request, Response } from 'express';
import { simplifyTryCatch, responseHelper } from '@/utils/common';
import { StatusCodes } from 'http-status-codes';
import transactionServices from '@/services/transactionServices';
import {
  GetTransactionsByDateSchema,
  GetTransactionsDashboardSummarySchema,
} from '@repo/shared';

const createTransaction = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const userId = req.user.userId;
    const result = await transactionServices.createTransaction(
      req.body,
      userId
    );

    return res
      .status(StatusCodes.CREATED)
      .json(
        responseHelper(true, result, 'Create transaction successfully', null)
      );
  });
};

const getTransactionsByDate = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const query = req.query as GetTransactionsByDateSchema;
    const userId = req.user.userId;

    const result = await transactionServices.getTransactionsByDate(
      query,
      userId
    );

    return res
      .status(StatusCodes.OK)
      .json(
        responseHelper(true, result, 'Get transactions successfully', null)
      );
  });
};

const getTransactionsSummary = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const { startDate, endDate } =
      req.body as GetTransactionsDashboardSummarySchema;
    const userId = req.user.userId;

    const result = await transactionServices.getTransactionsDashboardSummary(
      { startDate, endDate },
      userId
    );

    return res
      .status(StatusCodes.OK)
      .json(
        responseHelper(
          true,
          result,
          'Get transactions summary successfully',
          null
        )
      );
  });
};

const getTransactionById = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const { id } = req.params;
    const userId = req.user.userId;
    if (!id) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(responseHelper(false, null, 'Id is required', null));
    }

    const result = await transactionServices.getTransactionById(id, userId);

    return res
      .status(StatusCodes.OK)
      .json(responseHelper(true, result, 'Get transaction successfully', null));
  });
};

const updateIncomeExpense = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const { id } = req.params;
    const userId = req.user.userId;
    if (!id) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(responseHelper(false, null, 'Id is required', null));
    }

    const result = await transactionServices.updateIncomeExpense(
      id,
      req.body,
      userId
    );

    return res
      .status(StatusCodes.OK)
      .json(
        responseHelper(true, result, 'Update transaction successfully', null)
      );
  });
};

const deleteTransaction = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const { id } = req.params;
    const userId = req.user.userId;
    if (!id) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(responseHelper(false, null, 'Id is required', null));
    }

    const result = await transactionServices.deleteTransaction(id, userId);

    return res
      .status(StatusCodes.OK)
      .json(
        responseHelper(true, result, 'Delete transaction successfully', null)
      );
  });
};

const createTransfer = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const userId = req.user.userId;
    const result = await transactionServices.createTransfer(req.body, userId);

    return res
      .status(StatusCodes.CREATED)
      .json(responseHelper(true, result, 'Create transfer successfully', null));
  });
};

export default {
  createTransaction,
  getTransactionsByDate,
  getTransactionById,
  updateIncomeExpense,
  deleteTransaction,
  createTransfer,
  getTransactionsSummary,
};
