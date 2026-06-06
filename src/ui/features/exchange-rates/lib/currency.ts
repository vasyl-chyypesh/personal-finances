import type { Currency, ExchangeRates } from '../../../types.ts';

/**
 * Converts an amount between currencies using a pairwise rate matrix fetched from
 * the API (`rates[from][to]`). The matrix is the single source of truth — no rate
 * constants live in the UI.
 */
export function convert(
  amount: number,
  from: Currency,
  to: Currency,
  rates: ExchangeRates,
): number {
  if (from === to) {
    return amount;
  }
  // eslint-disable-next-line security/detect-object-injection -- from/to are a typed Currency union
  return amount * rates[from][to];
}
