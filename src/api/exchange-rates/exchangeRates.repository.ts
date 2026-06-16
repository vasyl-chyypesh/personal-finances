import type Database from 'better-sqlite3';
import { QUOTE_CURRENCIES } from './exchangeRates.catalog.js';
import type { DailyQuotes, ProviderDaily, QuoteCurrency } from './exchangeRates.types.js';

interface QuoteRow {
  date: string;
  quote: QuoteCurrency;
  rate: number;
}

const QUOTE_SET = new Set<string>(QUOTE_CURRENCIES);

export interface IExchangeRatesRepository {
  /** Most recent stored day, or `null` when nothing is stored yet. */
  getLatest(): ProviderDaily | null;
  /** Distinct stored dates (base→quote rows) within an inclusive range. */
  getStoredDates(from: string, to: string): Set<string>;
  /** Complete daily quotes within an inclusive range, ascending by date. */
  getSeries(from: string, to: string): ProviderDaily[];
  /** Insert or replace the base→quote rows for a single day. */
  upsertDaily(date: string, quotes: DailyQuotes): void;
}

export class ExchangeRatesRepository implements IExchangeRatesRepository {
  constructor(private readonly db: Database.Database) {}

  getLatest(): ProviderDaily | null {
    const rows = this.db
      .prepare(
        `SELECT date, quote, rate FROM exchange_rates
         WHERE base = 'UAH'
           AND date = (SELECT MAX(date) FROM exchange_rates WHERE base = 'UAH')`,
      )
      .all() as QuoteRow[];
    return this.groupByDate(rows)[0] ?? null;
  }

  getStoredDates(from: string, to: string): Set<string> {
    const rows = this.db
      .prepare(
        `SELECT DISTINCT date FROM exchange_rates
         WHERE base = 'UAH' AND date BETWEEN ? AND ?`,
      )
      .all(from, to) as { date: string }[];
    return new Set(rows.map((r) => r.date));
  }

  getSeries(from: string, to: string): ProviderDaily[] {
    const rows = this.db
      .prepare(
        `SELECT date, quote, rate FROM exchange_rates
         WHERE base = 'UAH' AND date BETWEEN ? AND ?
         ORDER BY date ASC`,
      )
      .all(from, to) as QuoteRow[];
    return this.groupByDate(rows);
  }

  upsertDaily(date: string, quotes: DailyQuotes): void {
    const insert = this.db.prepare(
      `INSERT OR REPLACE INTO exchange_rates (date, base, quote, rate)
       VALUES (?, 'UAH', ?, ?)`,
    );
    this.db.transaction(() => {
      for (const quote of QUOTE_CURRENCIES) {
        /* eslint-disable-next-line security/detect-object-injection -- quote is a typed literal */
        insert.run(date, quote, quotes[quote]);
      }
    })();
  }

  /** Collapse base→quote rows into entries that carry every quote, by date. */
  private groupByDate(rows: QuoteRow[]): ProviderDaily[] {
    const byDate = new Map<string, Partial<DailyQuotes>>();
    for (const { date, quote, rate } of rows) {
      if (!QUOTE_SET.has(quote)) continue;
      const entry = byDate.get(date) ?? {};
      /* eslint-disable-next-line security/detect-object-injection -- quote is QUOTE_SET-checked */
      entry[quote] = rate;
      byDate.set(date, entry);
    }
    const complete: ProviderDaily[] = [];
    for (const [date, quotes] of byDate) {
      /* eslint-disable-next-line security/detect-object-injection -- c is a typed literal */
      if (QUOTE_CURRENCIES.every((c) => quotes[c] !== undefined)) {
        complete.push({ date, quotes: quotes as DailyQuotes });
      }
    }
    complete.sort((a, b) => a.date.localeCompare(b.date));
    return complete;
  }
}
