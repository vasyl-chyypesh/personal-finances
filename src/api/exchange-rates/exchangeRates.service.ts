import { BASE_CURRENCY } from './exchangeRates.catalog.js';
import type { IExchangeRatesRepository } from './exchangeRates.repository.js';
import type { ExchangeRatesResponse } from './exchangeRates.types.js';

export class ExchangeRatesService {
  constructor(private readonly repository: IExchangeRatesRepository) {}

  getRates(): ExchangeRatesResponse {
    return { base: BASE_CURRENCY, rates: this.repository.getAll() };
  }
}
