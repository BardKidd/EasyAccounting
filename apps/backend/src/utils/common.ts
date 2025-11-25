import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

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
