import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import request from 'supertest';
import type { Express } from 'express';
import type { ExchangeRatesResponse } from '../exchangeRates.types.js';

const RATES_TEST_DB = './exchange-rates-test.db';
process.env['DB_PATH'] = RATES_TEST_DB;

describe('Exchange rates routes (HTTP integration)', () => {
  let app: Express;

  before(async () => {
    const { default: importedApp } = await import('../../app.js');
    app = importedApp;
  });

  after(async () => {
    await Promise.all([
      rm(RATES_TEST_DB, { force: true }),
      rm(`${RATES_TEST_DB}-wal`, { force: true }),
      rm(`${RATES_TEST_DB}-shm`, { force: true }),
    ]);
  });

  it('GET / returns the base currency and full pairwise matrix', async () => {
    const res = await request(app).get('/api/exchange-rates');
    assert.equal(res.status, 200);
    const body = res.body as ExchangeRatesResponse;
    assert.equal(body.base, 'UAH');
    for (const from of ['UAH', 'USD', 'EUR'] as const) {
      // eslint-disable-next-line security/detect-object-injection -- from is a typed Currency union
      assert.equal(body.rates[from][from], 1, `${from}->${from} should be identity`);
    }
  });

  it('GET / encodes the three stated rates verbatim', async () => {
    const res = await request(app).get('/api/exchange-rates');
    const { rates } = res.body as ExchangeRatesResponse;
    assert.equal(rates.USD.UAH, 44);
    assert.equal(rates.EUR.UAH, 52);
    assert.equal(rates.EUR.USD, 1.16);
  });

  it('GET / returns the full seeded matrix (every pair persisted)', async () => {
    const res = await request(app).get('/api/exchange-rates');
    const { rates } = res.body as ExchangeRatesResponse;
    const currencies = ['UAH', 'USD', 'EUR'] as const;
    for (const from of currencies) {
      for (const to of currencies) {
        // eslint-disable-next-line security/detect-object-injection -- from/to are typed Currency literals
        const rate = rates[from][to];
        assert.equal(typeof rate, 'number', `${from}->${to} should be stored`);
        assert.ok(rate > 0, `${from}->${to} should be positive`);
      }
    }
  });
});
