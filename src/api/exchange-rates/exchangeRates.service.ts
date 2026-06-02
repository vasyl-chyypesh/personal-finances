import type { ExchangeRates, ExchangeRatesResponse } from './exchangeRates.types.js';

/**
 * Canonical conversion rates. Fixed for now (no external source / DB); the three
 * stated pairs are encoded verbatim — `1 USD = 44 UAH`, `1 EUR = 52 UAH`,
 * `1 EUR = 1.16 USD` — so `EUR→USD` stays `1.16` rather than the derived `52/44`.
 */
const RATES: ExchangeRates = {
  UAH: { UAH: 1, USD: 1 / 44, EUR: 1 / 52 },
  USD: { UAH: 44, USD: 1, EUR: 1 / 1.16 },
  EUR: { UAH: 52, USD: 1.16, EUR: 1 },
};

export class ExchangeRatesService {
  getRates(): ExchangeRatesResponse {
    return { base: 'UAH', rates: RATES };
  }
}
