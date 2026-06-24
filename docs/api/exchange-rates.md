# Exchange rates

> Feature internals extracted from `src/api/CLAUDE.md`. That guide holds the
> conventions; this file holds the per-feature detail.

Rates are **date-keyed and provider-backed**. The `exchange_rates` table is
`(date, base, quote, rate)` with PK on the triple; only the two `UAH→USD` /
`UAH→EUR` quotes are stored per day, and the full pairwise matrix (identities,
inverses, the `EUR↔USD` cross-rate) is **derived** from them in the service — so
`EUR↔USD` is computed (e.g. `52/44`), never verbatim.

- **Provider** (`exchangeRates.provider.ts`): a Frankfurter **v2** client
  (`https://api.frankfurter.dev/v2`, no key) — `createExchangeRatesProvider({ fetchImpl?, baseUrl? })`
  is injectable so tests never hit the network. `fetchLatest()` / `fetchRange(from,to)`
  return rows grouped into `{ date, quotes }`, keeping only days that carry every
  `QUOTE_CURRENCIES` value.
- **Sync** (`exchangeRates.sync.ts`): `ExchangeRatesSync` orchestrates provider→DB.
  `refreshToday()` upserts the latest day; `backfillHistory()` warms
  `[today − BACKFILL_MONTHS, today]` in `BACKFILL_BATCH_MONTHS`-sized batches
  (skipping fully-past months that already have data, always re-fetching the month
  containing today); `ensureRange(from,to)` lazily fills a requested read range,
  fetching the single contiguous span covering any uncovered months in one provider
  call. Every method is best-effort (failures logged, never thrown). `sync()`
  (backfill + refresh) is triggered from **`index.ts`** after `listen` (kept out of
  `app.ts` so HTTP tests stay network-free).
- **Endpoints**: `GET /api/exchange-rates` → `{ base, asOf, stale, rates }` (latest
  stored matrix; `stale` when `asOf` is older than `STALE_AFTER_DAYS`).
  `GET /api/exchange-rates/history?from&to` → `{ base, from, to, series }` for
  charts, where each point's `rates[quote]` is **base-per-unit** (1 USD = X UAH).
  The read range is clamped to today and to a `MAX_HISTORY_MONTHS` span; uncovered
  dates within it are fetched **on demand** via `ensureRange` (then cached) before
  reading. `exchangeRates.schema.ts` validates the history query. The service takes
  the repository **and an optional sync** — without a sync (or with `RATES_OFFLINE`)
  reads are DB-only.
- **Offline switch**: `RATES_OFFLINE=1` (or `true`) skips the startup sync and
  constructs the routes' service without a sync, so reads never touch the provider —
  used to run fully offline and to keep HTTP tests network-free (the integration
  test sets it).
- `exchangeRates.catalog.ts` holds `BASE_CURRENCY`, `QUOTE_CURRENCIES`, the
  provider/timeout constants, `BACKFILL_MONTHS` (startup warm window),
  `MAX_HISTORY_MONTHS` (max read span), and `DEFAULT_EXCHANGE_RATES` (offline
  fallback). `seedExchangeRates` seeds today's quotes from the fallback only when the
  table is empty; the first successful sync overrides them. `migrateSchema` drops the
  legacy `(from_currency, to_currency, rate)` table and recreates the date-keyed
  shape.
