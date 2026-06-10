import { describe, it, expect } from 'vitest';
import { normalizeCurrencyCode, Currency, DEFAULT_CURRENCY } from '..';

describe('normalizeCurrencyCode', () => {
  it('將舊代碼 NTD 映射為 TWD', () => {
    expect(normalizeCurrencyCode('NTD')).toBe(Currency.TWD);
  });

  it('大小寫與前後空白不影響 NTD 映射', () => {
    expect(normalizeCurrencyCode(' ntd ')).toBe(Currency.TWD);
    expect(normalizeCurrencyCode('Ntd')).toBe(Currency.TWD);
  });

  it('合法 ISO 代碼原樣回傳（大寫去空白）', () => {
    expect(normalizeCurrencyCode('USD')).toBe('USD');
    expect(normalizeCurrencyCode(' jpy ')).toBe('JPY');
    expect(normalizeCurrencyCode('TWD')).toBe('TWD');
  });

  it('空字串回傳空字串（由呼叫端決定是否套預設）', () => {
    expect(normalizeCurrencyCode('')).toBe('');
  });

  it('DEFAULT_CURRENCY 已切換為 TWD', () => {
    expect(DEFAULT_CURRENCY).toBe(Currency.TWD);
    expect(Currency.TWD).toBe('TWD');
  });
});
