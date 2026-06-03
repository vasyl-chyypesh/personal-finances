import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ExchangeRatesService } from '../exchangeRates.service.js';
import type { IExchangeRatesRepository } from '../exchangeRates.repository.js';
import type { ExchangeRates } from '../exchangeRates.types.js';

const stubRates: ExchangeRates = {
  UAH: { UAH: 1, USD: 1 / 40, EUR: 1 / 50 },
  USD: { UAH: 40, USD: 1, EUR: 0.9 },
  EUR: { UAH: 50, USD: 1.1, EUR: 1 },
};

function makeMockRepo(rates: ExchangeRates): IExchangeRatesRepository {
  return { getAll: () => rates };
}

describe('ExchangeRatesService (unit)', () => {
  it('getRates reports UAH as the base currency', () => {
    const service = new ExchangeRatesService(makeMockRepo(stubRates));
    assert.equal(service.getRates().base, 'UAH');
  });

  it('getRates returns the matrix supplied by the repository', () => {
    const service = new ExchangeRatesService(makeMockRepo(stubRates));
    assert.deepEqual(service.getRates().rates, stubRates);
  });
});
