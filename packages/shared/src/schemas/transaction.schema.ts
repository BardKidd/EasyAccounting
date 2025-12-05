import { z } from 'zod';
import { MainType, PaymentFrequency } from '../constants';

export const createTransactionSchema = z.object({
  accountId: z.string().uuid(),
  categoryId: z.string().uuid(),
  amount: z.number(),
  type: z.enum([MainType.INCOME, MainType.EXPENSE, MainType.OPERATE]),
  description: z.string().nullable(),
  date: z.string(),
  time: z.string(),
  receipt: z.string().nullable(),
  paymentFrequency: z.enum([
    PaymentFrequency.ONE_TIME,
    PaymentFrequency.RECURRING,
    PaymentFrequency.INSTALLMENT,
  ]),
});

export const updateTransactionSchema = createTransactionSchema;

export const getTransactionsByDateSchema = z.object({
  accountId: z.string().uuid(),
  categoryId: z.string().uuid(),
});

export type CreateTransactionSchema = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionSchema = z.infer<typeof updateTransactionSchema>;
export type GetTransactionsByDateSchema = z.infer<
  typeof getTransactionsByDateSchema
>;
