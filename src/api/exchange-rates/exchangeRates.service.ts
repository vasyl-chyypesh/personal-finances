import {
  BASE_CURRENCY,
  DEFAULT_EXCHANGE_RATES,
  QUOTE_CURRENCIES,
  STALE_AFTER_DAYS,
} from './exchangeRates.catalog.js';
import type { IExchangeRatesRepository } from './exchangeRates.repository.js';
import type { IExchangeRatesSync } from './exchangeRates.sync.js';
import type { HistoryQuery } from './exchangeRates.schema.js';
import { backfillFloorIso, maxSpanFloorIso, todayIso } from './exchangeRates.window.js';
import type {
  DailyQuotes,
  ExchangeRates,
  ExchangeRatesResponse,
  RateHistoryPoint,
  RateHistoryResponse,
} from './exchangeRates.types.js';

const MS_PER_DAY = 86_400_000;

export class ExchangeRatesService {
  constructor(
    private readonly repository: IExchangeRatesRepository,
    /** Optional: when present, history reads lazily warm uncached ranges. */
    private readonly sync?: IExchangeRatesSync,
  ) {}

  /** Latest stored matrix with freshness metadata. */
  getRates(): ExchangeRatesResponse {
    const latest = this.repository.getLatest();
    const today = todayIso();
    if (!latest) {
      // Defensive: the table is seeded for today, so this is effectively dead.
      return { base: BASE_CURRENCY, asOf: today, stale: false, rates: DEFAULT_EXCHANGE_RATES };
    }
    const ageDays = Math.floor((Date.parse(today) - Date.parse(latest.date)) / MS_PER_DAY);
    return {
      base: BASE_CURRENCY,
      asOf: latest.date,
      stale: ageDays > STALE_AFTER_DAYS,
      rates: buildMatrix(latest.quotes),
    };
  }

  /**
   * Time series of base-per-unit values for charts. The requested range is
   * clamped to today and to the max span; uncached dates are fetched on demand
   * (best-effort) before reading from the DB.
   */
  async getHistory(query: HistoryQuery): Promise<RateHistoryResponse> {
    const today = todayIso();
    const to = min(query.to ?? today, today);
    const spanFloor = maxSpanFloorIso(to);
    const defaultFrom = backfillFloorIso(to);
    const from = clamp(query.from ?? defaultFrom, spanFloor, to);

    await this.sync?.ensureRange(from, to);

    const series: RateHistoryPoint[] = this.repository
      .getSeries(from, to)
      .map(({ date, quotes }) => ({ date, rates: invertQuotes(quotes) }));

    return { base: BASE_CURRENCY, from, to, series };
  }
}

/** Derive the full 3×3 matrix from the two UAH→quote rates. */
function buildMatrix(quotes: DailyQuotes): ExchangeRates {
  const { USD, EUR } = quotes;
  return {
    UAH: { UAH: 1, USD, EUR },
    USD: { UAH: 1 / USD, USD: 1, EUR: EUR / USD },
    EUR: { UAH: 1 / EUR, USD: USD / EUR, EUR: 1 },
  };
}

/** Convert base→quote rates into base-per-unit values (1 USD = X UAH). */
function invertQuotes(quotes: DailyQuotes): DailyQuotes {
  const out = {} as DailyQuotes;
  for (const quote of QUOTE_CURRENCIES) {
    /* eslint-disable-next-line security/detect-object-injection -- quote is a typed literal */
    out[quote] = 1 / quotes[quote];
  }
  return out;
}

function clamp(value: string, lo: string, hi: string): string {
  if (value < lo) return lo;
  if (value > hi) return hi;
  return value;
}

function min(a: string, b: string): string {
  return a < b ? a : b;
}
