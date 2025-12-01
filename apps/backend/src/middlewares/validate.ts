import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { responseHelper } from '@/utils/common';

export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json(
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
