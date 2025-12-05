import { Request, Response, NextFunction } from 'express';
import { responseHelper } from '@/utils/common';
import { StatusCodes } from 'http-status-codes';
import { z } from '@repo/shared';

export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(StatusCodes.BAD_REQUEST).json(
          responseHelper(
            false,
            null,
            'Validation failed',
            error.errors.map((err) => ({
              path: err.path.join('.'),
              message: err.message,
            }))
          )
        );
      }
      next(error);
    }
  };
};
