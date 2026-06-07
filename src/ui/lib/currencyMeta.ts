import type { Currency, ExchangeRates } from '../types.ts';

/** Display metadata for the fixed currency set (UAH/USD/EUR). */
export const CURRENCY_META: Record<Currency, { flag: string; name: string }> = {
  UAH: { flag: '🇺🇦', name: 'Ukrainian Hryvnia' },
  USD: { flag: '🇺🇸', name: 'US Dollar' },
  EUR: { flag: '🇪🇺', name: 'Euro' },
};

/**
 * Convert integer minor units from one currency to another using the pairwise
 * matrix. `rates[from][to]` is the multiplier. Returns rounded integer cents
 * (all supported currencies share a scale of 100, so the unit is preserved).
 */
export function convertCents(
  cents: number,
  from: Currency,
  to: Currency,
  rates: ExchangeRates,
): number {
  if (from === to) return cents;
  // eslint-disable-next-line security/detect-object-injection -- from/to are Currency unions
  const rate = rates[from]?.[to];
  if (rate === undefined) return cents;
  return Math.round(cents * rate);
}
