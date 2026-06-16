import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { rm } from 'node:fs/promises';
import { initDb } from '../../shared/schema.js';
import { ExchangeRatesRepository } from '../exchangeRates.repository.js';
import { ExchangeRatesSync } from '../exchangeRates.sync.js';
import type { IExchangeRatesProvider } from '../exchangeRates.provider.js';
import type { DailyQuotes } from '../exchangeRates.types.js';
import { backfillFloorIso, todayIso } from '../exchangeRates.window.js';

const DB_FILE = './exchange-rates-sync-test.db';
const QUOTES: DailyQuotes = { USD: 0.022, EUR: 0.019 };

class FakeProvider implements IExchangeRatesProvider {
  rangeCalls: Array<[string, string]> = [];
  latestCalls = 0;

  fetchLatest() {
    this.latestCalls += 1;
    return Promise.resolve({ date: todayIso(), quotes: QUOTES });
  }

  fetchRange(from: string, to: string) {
    this.rangeCalls.push([from, to]);
    // Two representative business days per chunk.
    return Promise.resolve([
      { date: from, quotes: QUOTES },
      { date: to, quotes: QUOTES },
    ]);
  }
}

describe('ExchangeRatesSync (integration)', () => {
  let db: Database.Database;
  let repo: ExchangeRatesRepository;

  before(() => {
    db = new Database(DB_FILE);
    initDb(db);
    repo = new ExchangeRatesRepository(db);
  });

  beforeEach(() => {
    db.exec('DELETE FROM exchange_rates');
  });

  after(async () => {
    db.close();
    await Promise.all([
      rm(DB_FILE, { force: true }),
      rm(`${DB_FILE}-wal`, { force: true }),
      rm(`${DB_FILE}-shm`, { force: true }),
    ]);
  });

  it('refreshToday stores the latest quotes', async () => {
    const provider = new FakeProvider();
    await new ExchangeRatesSync(repo, provider).refreshToday();
    const latest = repo.getLatest();
    assert.equal(latest?.date, todayIso());
    assert.equal(latest?.quotes.USD, QUOTES.USD);
  });

  it('backfillHistory fetches the window in monthly batches and stores rows', async () => {
    const provider = new FakeProvider();
    await new ExchangeRatesSync(repo, provider).backfillHistory();
    // ~4-month window in 1-month chunks → at least 4 provider calls.
    assert.ok(
      provider.rangeCalls.length >= 4,
      `expected >=4 chunks, got ${provider.rangeCalls.length}`,
    );
    const stored = repo.getStoredDates(backfillFloorIso(), todayIso());
    assert.ok(stored.size > 0);
    assert.ok(stored.has(backfillFloorIso()));
  });

  it('skips a fully-past chunk that already has data', async () => {
    const empty = new FakeProvider();
    await new ExchangeRatesSync(repo, empty).backfillHistory();
    const baseline = empty.rangeCalls.length;

    db.exec('DELETE FROM exchange_rates');
    // Pre-seed the first (oldest) chunk so it is considered covered.
    repo.upsertDaily(backfillFloorIso(), QUOTES);
    const seeded = new FakeProvider();
    await new ExchangeRatesSync(repo, seeded).backfillHistory();

    assert.equal(seeded.rangeCalls.length, baseline - 1);
  });

  it('sync runs backfill then refreshes today', async () => {
    const provider = new FakeProvider();
    await new ExchangeRatesSync(repo, provider).sync();
    assert.equal(provider.latestCalls, 1);
    assert.ok(provider.rangeCalls.length >= 4);
  });

  it('ensureRange fetches an uncovered range as a single contiguous span', async () => {
    const provider = new FakeProvider();
    await new ExchangeRatesSync(repo, provider).ensureRange('2024-01-01', '2024-03-15');
    assert.equal(provider.rangeCalls.length, 1);
    assert.deepEqual(provider.rangeCalls[0], ['2024-01-01', '2024-03-15']);
    assert.ok(repo.getStoredDates('2024-01-01', '2024-03-15').size > 0);
  });

  it('ensureRange fetches nothing when the range is already covered', async () => {
    repo.upsertDaily('2024-05-10', QUOTES);
    const provider = new FakeProvider();
    await new ExchangeRatesSync(repo, provider).ensureRange('2024-05-01', '2024-05-28');
    assert.equal(provider.rangeCalls.length, 0);
  });
});
