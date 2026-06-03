import type { Currency } from '../ledger/ledger.types.js';
import type { ExchangeRates } from './exchangeRates.types.js';

/** The currency every stored amount is reported relative to. */
export const BASE_CURRENCY: Currency = 'UAH';

/**
 * Predefined conversion rates, used to seed the `exchange_rates` table when it is
 * empty. The three stated pairs are encoded verbatim — `1 USD = 44 UAH`,
 * `1 EUR = 52 UAH`, `1 EUR = 1.16 USD` — so `EUR→USD` stays `1.16` rather than the
 * derived `52/44`. Once seeded, the table is the source of truth.
 */
export const DEFAULT_EXCHANGE_RATES: ExchangeRates = {
  UAH: { UAH: 1, USD: 1 / 44, EUR: 1 / 52 },
  USD: { UAH: 44, USD: 1, EUR: 1 / 1.16 },
  EUR: { UAH: 52, USD: 1.16, EUR: 1 },
};
