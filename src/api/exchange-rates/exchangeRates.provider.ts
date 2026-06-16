import { z } from 'zod';
import { FETCH_TIMEOUT_MS, PROVIDER_BASE_URL, QUOTE_CURRENCIES } from './exchangeRates.catalog.js';
import type { DailyQuotes, ProviderDaily, QuoteCurrency } from './exchangeRates.types.js';

/** Each item the Frankfurter `/rates` endpoint returns. */
const RateRowSchema = z.object({
  date: z.iso.date(),
  quote: z.string(),
  rate: z.number().positive(),
});

const RatesResponseSchema = z.array(RateRowSchema);

const QUOTE_SET = new Set<string>(QUOTE_CURRENCIES);

export interface IExchangeRatesProvider {
  /** Latest available business-day quotes for the base currency. */
  fetchLatest(): Promise<ProviderDaily>;
  /** All business-day quotes between `from` and `to` (inclusive). */
  fetchRange(from: string, to: string): Promise<ProviderDaily[]>;
}

interface ProviderDeps {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

/**
 * Frankfurter v2 client. The provider returns only base→quote rows; we group
 * them by date and keep days that carry every {@link QUOTE_CURRENCIES} value.
 */
export function createExchangeRatesProvider(deps: ProviderDeps = {}): IExchangeRatesProvider {
  const baseUrl = deps.baseUrl ?? PROVIDER_BASE_URL;
  const fetchImpl = deps.fetchImpl ?? fetch;
  const quotesParam = QUOTE_CURRENCIES.join(',');

  async function getRates(params: Record<string, string>): Promise<ProviderDaily[]> {
    const search = new URLSearchParams({ base: 'UAH', quotes: quotesParam, ...params });
    const url = `${baseUrl}/rates?${search.toString()}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetchImpl(url, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      throw new Error(`Frankfurter request failed (${res.status}) for ${url}`);
    }
    const rows = RatesResponseSchema.parse(await res.json());
    return groupByDate(rows);
  }

  return {
    async fetchLatest() {
      const days = await getRates({});
      const day = days.at(-1);
      if (!day) throw new Error('Frankfurter returned no rates for latest');
      return day;
    },
    fetchRange(from: string, to: string) {
      return getRates({ from, to });
    },
  };
}

/** Collapse base→quote rows into one entry per date carrying every quote. */
function groupByDate(rows: z.infer<typeof RatesResponseSchema>): ProviderDaily[] {
  const byDate = new Map<string, Partial<DailyQuotes>>();
  for (const { date, quote, rate } of rows) {
    if (!QUOTE_SET.has(quote)) continue;
    const entry = byDate.get(date) ?? {};
    entry[quote as QuoteCurrency] = rate;
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
