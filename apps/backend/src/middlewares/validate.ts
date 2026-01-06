import { Request, Response, NextFunction } from 'express';
import { responseHelper } from '@/utils/common';
import { StatusCodes } from 'http-status-codes';
import { z } from '@repo/shared';

export const validate = (
  schema: z.ZodSchema,
  source: 'body' | 'query' | 'params' = 'body'
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[source]);
      // Express 5 中 req.query 可能為唯讀屬性 (getter)，無法直接賦值
      // 故改為修改其內容
      if (source === 'body') {
        req.body = parsed;
      } else {
        // 清空舊屬性並寫入新屬性 (含 Zod 預設值)
        Object.keys(req[source]).forEach((key) => delete req[source][key]);
        // 這樣不會改變到 req[source] 的引用，所以可以安全地修改
        Object.assign(req[source], parsed);
      }
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
