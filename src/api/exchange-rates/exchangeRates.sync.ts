import { Logger } from '../shared/logger.js';
import { BACKFILL_BATCH_MONTHS } from './exchangeRates.catalog.js';
import type { IExchangeRatesProvider } from './exchangeRates.provider.js';
import type { IExchangeRatesRepository } from './exchangeRates.repository.js';
import { addDaysIso, addMonthsIso, backfillFloorIso, todayIso } from './exchangeRates.window.js';

/** Minimal surface the service needs to lazily warm a requested range. */
export interface IExchangeRatesSync {
  ensureRange(from: string, to: string): Promise<void>;
}

interface Chunk {
  start: string;
  end: string;
  isLatest: boolean;
}

/**
 * Orchestrates pulling rates from the provider into the DB. Every method is
 * best-effort: failures are logged and swallowed so a provider outage never
 * crashes startup or a read — stored/seeded rates keep serving.
 */
export class ExchangeRatesSync implements IExchangeRatesSync {
  constructor(
    private readonly repository: IExchangeRatesRepository,
    private readonly provider: IExchangeRatesProvider,
  ) {}

  /** Fetch the latest business-day quotes and store them. */
  async refreshToday(): Promise<void> {
    try {
      const day = await this.provider.fetchLatest();
      this.repository.upsertDaily(day.date, day.quotes);
      Logger.log(`Exchange rates refreshed for ${day.date}`);
    } catch (err) {
      Logger.error('Exchange rates refresh failed', err);
    }
  }

  /**
   * Warm the startup window in monthly batches. A fully-past month that already
   * has data is skipped; the month containing today is always (re)fetched so the
   * leading edge and intra-month gaps stay current.
   */
  async backfillHistory(): Promise<void> {
    for (const { start, end, isLatest } of this.chunks(backfillFloorIso(), todayIso())) {
      if (isLatest || this.repository.getStoredDates(start, end).size === 0) {
        await this.fetchChunk(start, end);
      }
    }
  }

  /**
   * Ensure [from, to] is cached for a read. Detects uncovered monthly chunks and
   * fetches the single contiguous span spanning them in one provider call (so a
   * deep selection costs one request, not one per month). A fully-covered range
   * fetches nothing.
   */
  async ensureRange(from: string, to: string): Promise<void> {
    let gapStart: string | null = null;
    let gapEnd: string | null = null;
    for (const { start, end } of this.chunks(from, to)) {
      if (this.repository.getStoredDates(start, end).size === 0) {
        gapStart ??= start;
        gapEnd = end;
      }
    }
    if (gapStart && gapEnd) await this.fetchChunk(gapStart, gapEnd);
  }

  /** Run a full startup sync: backfill the window, then ensure today is current. */
  async sync(): Promise<void> {
    await this.backfillHistory();
    await this.refreshToday();
  }

  /** Yields inclusive monthly [start, end] chunks covering [from, to]. */
  private *chunks(from: string, to: string): Generator<Chunk> {
    let start = from;
    while (start <= to) {
      const nextStart = addMonthsIso(BACKFILL_BATCH_MONTHS, start);
      const end = min(addDaysIso(-1, nextStart), to);
      yield { start, end, isLatest: end === to };
      start = nextStart;
    }
  }

  private async fetchChunk(from: string, to: string): Promise<void> {
    try {
      const days = await this.provider.fetchRange(from, to);
      for (const day of days) {
        this.repository.upsertDaily(day.date, day.quotes);
      }
      Logger.log(`Exchange rates fetched ${from}..${to} (${days.length} days)`);
    } catch (err) {
      Logger.error(`Exchange rates fetch failed for ${from}..${to}`, err);
    }
  }
}

function min(a: string, b: string): string {
  return a < b ? a : b;
}
