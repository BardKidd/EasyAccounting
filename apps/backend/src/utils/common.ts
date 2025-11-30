import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Transaction } from 'sequelize';
import sequelize from '../utils/postgres';

export const simplifyTryCatch = async (
  req: Request,
  res: Response,
  cb: () => Promise<any>
) => {
  try {
    await cb();
  } catch (error) {
    console.error('Error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const simplifyTransaction = async (
  cb: (t: Transaction) => Promise<any>
) => {
  // 可以不用自己寫 commit 或 rollback。只是想封裝一下看起來比較直覺。
  return await sequelize.transaction(cb);
};
