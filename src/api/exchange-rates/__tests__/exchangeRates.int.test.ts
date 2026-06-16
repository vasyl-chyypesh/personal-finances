import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import request from 'supertest';
import type { Express } from 'express';
import type { ExchangeRatesResponse, RateHistoryResponse } from '../exchangeRates.types.js';
import { backfillFloorIso, maxSpanFloorIso, todayIso } from '../exchangeRates.window.js';

const RATES_TEST_DB = './exchange-rates-test.db';
process.env['DB_PATH'] = RATES_TEST_DB;
// Keep reads DB-only so the suite never reaches the provider.
process.env['RATES_OFFLINE'] = '1';

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

  it('GET / returns base, asOf, stale and the full pairwise matrix', async () => {
    const res = await request(app).get('/api/exchange-rates');
    assert.equal(res.status, 200);
    const body = res.body as ExchangeRatesResponse;
    assert.equal(body.base, 'UAH');
    assert.equal(body.asOf, todayIso());
    assert.equal(body.stale, false);
    for (const from of ['UAH', 'USD', 'EUR'] as const) {
      // eslint-disable-next-line security/detect-object-injection -- from is a typed Currency union
      assert.equal(body.rates[from][from], 1, `${from}->${from} should be identity`);
    }
  });

  it('GET / derives the seeded UAH pairs and the EUR↔USD cross-rate', async () => {
    const res = await request(app).get('/api/exchange-rates');
    const { rates } = res.body as ExchangeRatesResponse;
    assert.equal(rates.USD.UAH, 44);
    assert.equal(rates.EUR.UAH, 52);
    // Derived from the UAH quotes (52/44), not a verbatim figure.
    assert.ok(Math.abs(rates.EUR.USD - 52 / 44) < 1e-9);
  });

  it('GET / returns a positive number for every pair', async () => {
    const res = await request(app).get('/api/exchange-rates');
    const { rates } = res.body as ExchangeRatesResponse;
    const currencies = ['UAH', 'USD', 'EUR'] as const;
    for (const from of currencies) {
      for (const to of currencies) {
        // eslint-disable-next-line security/detect-object-injection -- from/to are typed Currency literals
        const rate = rates[from][to];
        assert.equal(typeof rate, 'number', `${from}->${to} should be present`);
        assert.ok(rate > 0, `${from}->${to} should be positive`);
      }
    }
  });

  it('GET /history returns base-per-unit series within the clamped window', async () => {
    const res = await request(app).get('/api/exchange-rates/history');
    assert.equal(res.status, 200);
    const body = res.body as RateHistoryResponse;
    assert.equal(body.base, 'UAH');
    assert.equal(body.to, todayIso());
    assert.equal(body.from, backfillFloorIso());
    // Only today's row is seeded, so one point with inverted values (~44/~52).
    assert.equal(body.series.length, 1);
    assert.ok(Math.abs(body.series[0].rates.USD - 44) < 1e-9);
  });

  it('GET /history clamps a too-old from-date up to the max-span floor', async () => {
    const res = await request(app).get('/api/exchange-rates/history?from=2000-01-01');
    assert.equal(res.status, 200);
    assert.equal((res.body as RateHistoryResponse).from, maxSpanFloorIso());
  });

  it('GET /history rejects from after to', async () => {
    const res = await request(app).get('/api/exchange-rates/history?from=2026-06-15&to=2026-06-01');
    assert.equal(res.status, 400);
  });
});
