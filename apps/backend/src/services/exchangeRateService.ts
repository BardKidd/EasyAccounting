import { Op } from 'sequelize';
import { ExchangeRate, Currency } from '@/models';
import { ExchangeRateSource, roundRate } from '@repo/shared';

/**
 * 匯率查詢 / 抓取 service。
 *
 * 查某日匯率規則：取 baseCode→quoteCode 中 rateDate <= 目標日 的「最近一筆」。
 * 同幣別恆為 1。查無資料回傳 null（呼叫端決定 fallback / 告警）。
 *
 * Phase 3：可接外部 API（預設 exchangerate.host；可用 EXCHANGE_RATE_API_URL 覆寫）寫入
 * source='API'，並加記憶體快取降低 DB 壓力。
 */

const todayStr = (): string => new Date().toISOString().slice(0, 10);

// 記憶體快取：key = `${base}|${quote}|${date}` → rate（process 生命週期內有效）
const rateCache = new Map<string, number | null>();
const cacheKey = (b: string, q: string, d: string) => `${b}|${q}|${d}`;

export const clearRateCache = () => rateCache.clear();

export const getRate = async (
  baseCode: string,
  quoteCode: string,
  date: string = todayStr(),
): Promise<number | null> => {
  if (baseCode === quoteCode) return 1;

  const key = cacheKey(baseCode, quoteCode, date);
  if (rateCache.has(key)) return rateCache.get(key) ?? null;

  const row = await ExchangeRate.findOne({
    where: {
      baseCode,
      quoteCode,
      rateDate: { [Op.lte]: date },
    },
    order: [
      ['rateDate', 'DESC'],
      // 同日多來源時 API 視為較新（晚寫入），createdAt DESC 取最新
      ['createdAt', 'DESC'],
    ],
  });

  if (row) {
    const r = Number(row.rate);
    rateCache.set(key, r);
    return r;
  }

  // 退而求其次：反向匯率（quote→base）取倒數
  const inverse = await ExchangeRate.findOne({
    where: {
      baseCode: quoteCode,
      quoteCode: baseCode,
      rateDate: { [Op.lte]: date },
    },
    order: [
      ['rateDate', 'DESC'],
      ['createdAt', 'DESC'],
    ],
  });
  if (inverse && Number(inverse.rate) !== 0) {
    // 匯率取倒數用 10 位精度（對齊 DECIMAL(20,10)），避免小匯率掉精度
    const r = roundRate(1 / Number(inverse.rate));
    rateCache.set(key, r);
    return r;
  }

  rateCache.set(key, null);
  return null;
};

const PROVIDER_URL =
  process.env.EXCHANGE_RATE_API_URL || 'https://api.exchangerate.host';
const PROVIDER_NAME = process.env.EXCHANGE_RATE_API_NAME || 'exchangerate.host';

/**
 * 抓取 baseCode → 其餘 active 幣別 的最新匯率並寫入 exchange_rate（source='API'）。
 * 失敗時不拋出（避免 cron 中斷），回傳成功寫入筆數。
 */
export const fetchRatesForBase = async (
  baseCode: string,
  date: string = todayStr(),
): Promise<number> => {
  const actives = await Currency.findAll({ where: { isActive: true } });
  const symbols = actives
    .map((c) => c.code)
    .filter((code) => code !== baseCode);
  if (symbols.length === 0) return 0;

  try {
    const url = `${PROVIDER_URL}/latest?base=${baseCode}&symbols=${symbols.join(',')}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      console.warn(`[exchangeRate] ${PROVIDER_NAME} ${baseCode} HTTP ${resp.status}`);
      return 0;
    }
    const json: any = await resp.json();
    const rates: Record<string, number> = json?.rates || {};

    let written = 0;
    for (const quoteCode of symbols) {
      const rate = Number(rates[quoteCode]);
      if (!Number.isFinite(rate) || rate <= 0) continue;
      // 依複合唯一鍵 (base,quote,date,source=API) findOrCreate；存在則更新 rate
      const [row, created] = await ExchangeRate.findOrCreate({
        where: {
          baseCode,
          quoteCode,
          rateDate: date,
          source: ExchangeRateSource.API,
        },
        defaults: {
          baseCode,
          quoteCode,
          rate,
          rateDate: date,
          source: ExchangeRateSource.API,
          provider: PROVIDER_NAME,
        } as any,
      });
      if (!created) await row.update({ rate, provider: PROVIDER_NAME });
      written += 1;
    }
    clearRateCache();
    return written;
  } catch (err: any) {
    console.warn(`[exchangeRate] fetch ${baseCode} failed: ${err?.message}`);
    return 0;
  }
};

/**
 * 抓取所有 active 幣別兩兩匯率（每個 active 幣別當 base）。給每日 cron 使用。
 */
export const fetchAllActiveRates = async (
  date: string = todayStr(),
): Promise<number> => {
  const actives = await Currency.findAll({ where: { isActive: true } });
  let total = 0;
  for (const c of actives) {
    total += await fetchRatesForBase(c.code, date);
  }
  return total;
};

export default { getRate, fetchRatesForBase, fetchAllActiveRates, clearRateCache };
