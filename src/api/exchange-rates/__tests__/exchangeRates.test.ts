import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ExchangeRatesService } from '../exchangeRates.service.js';
import type { IExchangeRatesRepository } from '../exchangeRates.repository.js';
import type { IExchangeRatesSync } from '../exchangeRates.sync.js';
import type { DailyQuotes, ProviderDaily } from '../exchangeRates.types.js';
import { backfillFloorIso, maxSpanFloorIso, todayIso } from '../exchangeRates.window.js';

const TODAY = todayIso();

/** Quotes equivalent to 1 USD = 44 UAH, 1 EUR = 52 UAH. */
const QUOTES: DailyQuotes = { USD: 1 / 44, EUR: 1 / 52 };

function makeRepo(overrides: Partial<IExchangeRatesRepository> = {}): IExchangeRatesRepository {
  return {
    getLatest: () => ({ date: TODAY, quotes: QUOTES }),
    getStoredDates: () => new Set<string>(),
    getSeries: () => [],
    upsertDaily: () => {},
    ...overrides,
  };
}

describe('ExchangeRatesService (unit)', () => {
  describe('getRates', () => {
    it('reports UAH as base and the latest stored date as asOf', () => {
      const service = new ExchangeRatesService(makeRepo());
      const res = service.getRates();
      assert.equal(res.base, 'UAH');
      assert.equal(res.asOf, TODAY);
    });

    it('derives the full matrix from the UAH quotes', () => {
      const service = new ExchangeRatesService(makeRepo());
      const { rates } = service.getRates();
      assert.equal(rates.UAH.UAH, 1);
      assert.equal(rates.USD.UAH, 44);
      assert.equal(rates.EUR.UAH, 52);
      // EUR→USD is the derived cross-rate (52/44), not a verbatim figure.
      assert.ok(Math.abs(rates.EUR.USD - 52 / 44) < 1e-9);
      assert.ok(Math.abs(rates.USD.EUR - 44 / 52) < 1e-9);
    });

    it('flags stale when the latest date is older than the threshold', () => {
      const service = new ExchangeRatesService(
        makeRepo({ getLatest: () => ({ date: '2020-01-01', quotes: QUOTES }) }),
      );
      assert.equal(service.getRates().stale, true);
    });

    it('is fresh when the latest date is today', () => {
      const service = new ExchangeRatesService(makeRepo());
      assert.equal(service.getRates().stale, false);
    });
  });

  describe('getHistory', () => {
    it('inverts stored quotes into base-per-unit values', async () => {
      const series: ProviderDaily[] = [{ date: TODAY, quotes: QUOTES }];
      const service = new ExchangeRatesService(makeRepo({ getSeries: () => series }));
      const res = await service.getHistory({});
      assert.equal(res.series.length, 1);
      assert.ok(Math.abs(res.series[0].rates.USD - 44) < 1e-9);
      assert.ok(Math.abs(res.series[0].rates.EUR - 52) < 1e-9);
    });

    it('defaults from to the backfill window and to to today', async () => {
      const service = new ExchangeRatesService(makeRepo());
      const res = await service.getHistory({});
      assert.equal(res.to, TODAY);
      assert.equal(res.from, backfillFloorIso());
    });

    it('clamps a too-old from-date up to the max-span floor', async () => {
      let captured: { from: string; to: string } | null = null;
      const service = new ExchangeRatesService(
        makeRepo({
          getSeries: (from, to) => {
            captured = { from, to };
            return [];
          },
        }),
      );
      const res = await service.getHistory({ from: '2000-01-01' });
      assert.equal(res.from, maxSpanFloorIso());
      assert.equal(captured?.from, maxSpanFloorIso());
    });

    it('caps the to-date at today', async () => {
      const service = new ExchangeRatesService(makeRepo());
      const res = await service.getHistory({ to: '2999-01-01' });
      assert.equal(res.to, TODAY);
    });

    it('warms the resolved range via the sync when one is provided', async () => {
      const calls: Array<[string, string]> = [];
      const sync: IExchangeRatesSync = {
        ensureRange: (from, to) => {
          calls.push([from, to]);
          return Promise.resolve();
        },
      };
      const service = new ExchangeRatesService(makeRepo(), sync);
      const res = await service.getHistory({ from: '2026-01-01', to: '2026-03-01' });
      assert.deepEqual(calls, [[res.from, res.to]]);
    });
  });
});
