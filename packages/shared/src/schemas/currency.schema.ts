import { z } from 'zod';

// 匯率來源：手動輸入 / 外部 API
export enum ExchangeRateSource {
  MANUAL = 'MANUAL',
  API = 'API',
}

// 幣別維度表 schema（對應 accounting.currency）
export const currencySchema = z.object({
  code: z.string().length(3), // ISO 4217（PK），如 'TWD'
  name: z.string().min(1),
  symbol: z.string().min(1),
  decimalPlaces: z.number().int().min(0).max(8).default(2),
  isCrypto: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

// 匯率時間序列 schema（對應 accounting.exchange_rate）
export const exchangeRateSchema = z.object({
  baseCode: z.string().length(3), // 來源幣別
  quoteCode: z.string().length(3), // 報價幣別
  rate: z.number().positive(), // 1 baseCode = rate quoteCode
  rateDate: z.string(), // DATEONLY，yyyy-MM-dd
  source: z.nativeEnum(ExchangeRateSource).default(ExchangeRateSource.MANUAL),
  provider: z.string().nullable().optional(),
});

export type CurrencySchema = z.infer<typeof currencySchema>;
export type ExchangeRateSchema = z.infer<typeof exchangeRateSchema>;
