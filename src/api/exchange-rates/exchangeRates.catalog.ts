import type { Currency } from '../ledger/ledger.types.js';
import type { ExchangeRates } from './exchangeRates.types.js';

/** The currency every stored amount is reported relative to. */
export const BASE_CURRENCY: Currency = 'UAH';

/**
 * The currencies we fetch from the provider, quoted against {@link BASE_CURRENCY}.
 * The provider returns only `UAH→USD` and `UAH→EUR`; the full pairwise matrix
 * (identities, inverses, and the `EUR↔USD` cross-rate) is derived from these.
 */
export const QUOTE_CURRENCIES = ['USD', 'EUR'] as const satisfies readonly Currency[];

/** Frankfurter v2 public API. No key required. */
export const PROVIDER_BASE_URL = 'https://api.frankfurter.dev/v2';

/** Abort a provider request that takes longer than this. */
export const FETCH_TIMEOUT_MS = 8000;

/** Stored rates older than this (in days) are reported as `stale`. */
export const STALE_AFTER_DAYS = 4;

/** Window the startup backfill warms into the DB, in months before today. */
export const BACKFILL_MONTHS = 4;

/** Largest span a single history request may cover (caps on-demand fetches). */
export const MAX_HISTORY_MONTHS = 12;

/** Backfill the history window in chunks of this many months per provider call. */
export const BACKFILL_BATCH_MONTHS = 1;

/**
 * Offline fallback conversion matrix, used to seed the `exchange_rates` table for
 * today's date when it is empty and the provider has not yet been reached. Real
 * fetched data overrides these on the first successful sync. The `EUR↔USD` value
 * here is derived from the UAH quotes once the provider runs — the verbatim
 * pairs below only ever apply to this offline seed.
 */
export const DEFAULT_EXCHANGE_RATES: ExchangeRates = {
  UAH: { UAH: 1, USD: 1 / 44, EUR: 1 / 52 },
  USD: { UAH: 44, USD: 1, EUR: 1 / 1.16 },
  EUR: { UAH: 52, USD: 1.16, EUR: 1 },
};
