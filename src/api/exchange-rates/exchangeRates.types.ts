import type { Currency } from '../ledger/ledger.types.js';
import type { QUOTE_CURRENCIES } from './exchangeRates.catalog.js';

/** A currency we quote against the base (currently `USD`/`EUR`). */
export type QuoteCurrency = (typeof QUOTE_CURRENCIES)[number];

/** The base→quote rates for a single day, e.g. `{ USD: 0.0223, EUR: 0.0192 }`. */
export type DailyQuotes = Record<QuoteCurrency, number>;

/**
 * Full pairwise conversion matrix: `rates[from][to]` multiplies an amount in
 * `from` to produce the equivalent amount in `to`.
 */
export type ExchangeRates = Record<Currency, Record<Currency, number>>;

export interface ExchangeRatesResponse {
  base: Currency;
  /** ISO date the served matrix was sourced for. */
  asOf: string;
  /** True when {@link asOf} is older than the freshness threshold. */
  stale: boolean;
  rates: ExchangeRates;
}

/** One point in a history series: the value of 1 unit of each quote in base. */
export interface RateHistoryPoint {
  date: string;
  /** `rates[quote]` = how many base units 1 unit of `quote` is worth. */
  rates: DailyQuotes;
}

export interface RateHistoryResponse {
  base: Currency;
  /** Effective (clamped) range actually covered by the series. */
  from: string;
  to: string;
  series: RateHistoryPoint[];
}

/** Normalized provider result for one or more days. */
export interface ProviderDaily {
  date: string;
  quotes: DailyQuotes;
}
