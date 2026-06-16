import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createExchangeRatesProvider } from '../exchangeRates.provider.js';

interface Row {
  date: string;
  base: string;
  quote: string;
  rate: number;
}

/** Build a fake `fetch` returning the given rows, recording the requested URL. */
function fakeFetch(rows: Row[], opts: { ok?: boolean; status?: number } = {}) {
  const calls: string[] = [];
  const impl = ((url: string) => {
    calls.push(url);
    return Promise.resolve({
      ok: opts.ok ?? true,
      status: opts.status ?? 200,
      json: () => Promise.resolve(rows),
    } as Response);
  }) as unknown as typeof fetch;
  return { impl, calls };
}

describe('Frankfurter provider (unit)', () => {
  it('groups rows by date and exposes both quotes', async () => {
    const { impl } = fakeFetch([
      { date: '2026-06-15', base: 'UAH', quote: 'USD', rate: 0.0223 },
      { date: '2026-06-15', base: 'UAH', quote: 'EUR', rate: 0.0192 },
    ]);
    const provider = createExchangeRatesProvider({ fetchImpl: impl });
    const day = await provider.fetchLatest();
    assert.equal(day.date, '2026-06-15');
    assert.equal(day.quotes.USD, 0.0223);
    assert.equal(day.quotes.EUR, 0.0192);
  });

  it('sends base=UAH and the configured quotes', async () => {
    const { impl, calls } = fakeFetch([
      { date: '2026-06-15', base: 'UAH', quote: 'USD', rate: 0.0223 },
      { date: '2026-06-15', base: 'UAH', quote: 'EUR', rate: 0.0192 },
    ]);
    await createExchangeRatesProvider({ fetchImpl: impl }).fetchLatest();
    assert.match(calls[0], /base=UAH/);
    assert.match(calls[0], /quotes=USD%2CEUR|quotes=USD,EUR/);
  });

  it('drops days missing a required quote', async () => {
    const { impl } = fakeFetch([{ date: '2026-06-15', base: 'UAH', quote: 'USD', rate: 0.0223 }]);
    const provider = createExchangeRatesProvider({ fetchImpl: impl });
    await assert.rejects(provider.fetchLatest(), /no rates/);
  });

  it('groups a multi-day range ascending by date', async () => {
    const { impl } = fakeFetch([
      { date: '2026-06-13', base: 'UAH', quote: 'EUR', rate: 0.019 },
      { date: '2026-06-12', base: 'UAH', quote: 'USD', rate: 0.022 },
      { date: '2026-06-13', base: 'UAH', quote: 'USD', rate: 0.0221 },
      { date: '2026-06-12', base: 'UAH', quote: 'EUR', rate: 0.0189 },
    ]);
    const days = await createExchangeRatesProvider({ fetchImpl: impl }).fetchRange(
      '2026-06-12',
      '2026-06-13',
    );
    assert.deepEqual(
      days.map((d) => d.date),
      ['2026-06-12', '2026-06-13'],
    );
  });

  it('throws on a non-ok response', async () => {
    const { impl } = fakeFetch([], { ok: false, status: 500 });
    await assert.rejects(
      createExchangeRatesProvider({ fetchImpl: impl }).fetchLatest(),
      /failed \(500\)/,
    );
  });
});
