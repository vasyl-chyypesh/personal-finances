import type Database from 'better-sqlite3';
import type { Currency } from '../ledger/ledger.types.js';
import type { ExchangeRates } from './exchangeRates.types.js';

interface RateRow {
  from_currency: Currency;
  to_currency: Currency;
  rate: number;
}

export interface IExchangeRatesRepository {
  getAll(): ExchangeRates;
}

export class ExchangeRatesRepository implements IExchangeRatesRepository {
  constructor(private readonly db: Database.Database) {}

  /** Reads every stored pair and rebuilds the `rates[from][to]` matrix. */
  getAll(): ExchangeRates {
    const rows = this.db
      .prepare('SELECT from_currency, to_currency, rate FROM exchange_rates')
      .all() as RateRow[];
    const rates = {} as ExchangeRates;
    for (const { from_currency, to_currency, rate } of rows) {
      /* eslint-disable security/detect-object-injection -- keys are CHECK-constrained Currency values */
      (rates[from_currency] ??= {} as Record<Currency, number>)[to_currency] = rate;
      /* eslint-enable security/detect-object-injection */
    }
    return rates;
  }
}
