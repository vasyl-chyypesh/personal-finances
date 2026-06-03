import type { Currency } from '../ledger/ledger.types.js';

/**
 * Full pairwise conversion matrix: `rates[from][to]` multiplies an amount in
 * `from` to produce the equivalent amount in `to`.
 */
export type ExchangeRates = Record<Currency, Record<Currency, number>>;

export interface ExchangeRatesResponse {
  base: Currency;
  rates: ExchangeRates;
}
