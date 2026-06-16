# src/api/CLAUDE.md

Guidance for the Express API under `src/api/`. See the root `CLAUDE.md` for project-wide rules (env, naming, hard constraints, tooling, commands).

## Architecture

The API follows a strict layered architecture:

```
Routes → Services → Repositories
```

- **Routes** (`*.routes.ts`): HTTP handlers, response shaping. Instantiates its own service using the shared db singleton and exports `default router` (not a factory function). Uses `requestValidator` middleware for input validation. MUST NOT import Repositories directly.
- **Schemas** (`*.schema.ts`): Zod schemas for a feature's routes. Imported by routes and passed to `requestValidator`.
- **Services** (`*.service.ts`): Business logic and orchestration. MUST NOT import Routes.
- **Repositories** (`*.repository.ts`): All SQLite queries and data mapping. MUST NOT import Services or Routes.
- **Types** (`*.types.ts`): Shared domain models and TypeScript interfaces for the feature.

Layer imports go one direction only (Routes → Services → Repositories). Cross-layer imports in the wrong direction will be rejected in review.

## API Feature Structure

Every new API feature lives in `src/api/<feature-name>/`:

- `<feature>.routes.ts`
- `<feature>.schema.ts` — only when the feature accepts input (body/query/params) to validate.
- `<feature>.service.ts`
- `<feature>.repository.ts`
- `<feature>.types.ts`
- `<feature>.catalog.ts` — only when the feature has seed/reference data consumed by `shared/schema.ts` (e.g. `categories`, `exchange-rates`).
- `__tests__/` — feature tests live here, split into:
  - `<feature>.int.test.ts` — HTTP integration tests (always required)
  - `<feature>.test.ts` — service unit tests (required when the service has logic worth isolating)

Cross-cutting HTTP tests that span features live in `src/api/__tests__/`.

## Request Validation

Use `requestValidator<T>(schema, source?)` from `src/api/shared/middlewares/requestValidator.ts` as route middleware. It validates the request against a Zod schema and stores the transformed result in `res.locals[source]` (default source: `body`). Route handlers read validated data from `res.locals.body`, `res.locals.query`, or `res.locals.params`.

```ts
router.post('/', requestValidator(CreateSchema), (req, res, next) => {
  res.status(201).json(service.create(res.locals.body as CreateDto));
});

router.get('/:id', requestValidator(IdParamSchema, RequestSource.params), (req, res, next) => {
  const { id } = res.locals.params as { id: number };
  res.json(service.findById(id));
});
```

## App entrypoint

`src/api/app.ts` exports the configured Express `app` as default. `src/api/index.ts` imports it and calls `app.listen()`. Tests that exercise HTTP routes import `app.ts` directly.

## Categories & i18n (API/data side)

Categories are **language-neutral with bilingual names**. The `categories` table is `(id, slug, names)` where `slug` is the stable identity and `names` is a JSON blob like `{"en":"Charity","uk":"Благодійність"}` (at least one locale; supported locales are `en` and `uk`).

- `src/api/categories/categories.catalog.ts` — `CATEGORY_CATALOG`, the canonical bilingual list (the `uk` value matches the xls parser's normalized labels). It is **both** the seed set (`seedCategories` inserts all of it) and the import mapping source. `resolveCategory(label, locale)` maps a label to a catalog `{ slug, names }`, falling back to a slugified single-locale category for unknown labels.
- `categories` is **writable**: `PATCH /api/categories/:id` with `{ names: { en?, uk? } }` merges translations (used to fill a missing-language name). `GET /api/categories` returns `{ id, slug, names }`; ledger entries embed the same category shape. The API returns **all translations** — the UI picks the active locale client-side. API error messages remain English.

The UI rendering half of i18n (locale selection, message catalogs, display-name resolution) lives in `src/ui/CLAUDE.md`. The catalog is also consumed by the importer — see `src/cli/CLAUDE.md`.

## Exchange rates

Rates are **date-keyed and provider-backed**. The `exchange_rates` table is `(date, base, quote, rate)` with PK on the triple; only the two `UAH→USD` / `UAH→EUR` quotes are stored per day, and the full pairwise matrix (identities, inverses, the `EUR↔USD` cross-rate) is **derived** from them in the service — so `EUR↔USD` is computed (e.g. `52/44`), never verbatim.

- **Provider** (`exchangeRates.provider.ts`): a Frankfurter **v2** client (`https://api.frankfurter.dev/v2`, no key) — `createExchangeRatesProvider({ fetchImpl?, baseUrl? })` is injectable so tests never hit the network. `fetchLatest()` / `fetchRange(from,to)` return rows grouped into `{ date, quotes }`, keeping only days that carry every `QUOTE_CURRENCIES` value.
- **Sync** (`exchangeRates.sync.ts`): `ExchangeRatesSync` orchestrates provider→DB. `refreshToday()` upserts the latest day; `backfillHistory()` warms `[today − BACKFILL_MONTHS, today]` in `BACKFILL_BATCH_MONTHS`-sized batches (skipping fully-past months that already have data, always re-fetching the month containing today); `ensureRange(from,to)` lazily fills a requested read range, fetching the single contiguous span covering any uncovered months in one provider call. Every method is best-effort (failures logged, never thrown). `sync()` (backfill + refresh) is triggered from **`index.ts`** after `listen` (kept out of `app.ts` so HTTP tests stay network-free).
- **Endpoints**: `GET /api/exchange-rates` → `{ base, asOf, stale, rates }` (latest stored matrix; `stale` when `asOf` is older than `STALE_AFTER_DAYS`). `GET /api/exchange-rates/history?from&to` → `{ base, from, to, series }` for charts, where each point's `rates[quote]` is **base-per-unit** (1 USD = X UAH). The read range is clamped to today and to a `MAX_HISTORY_MONTHS` span; uncovered dates within it are fetched **on demand** via `ensureRange` (then cached) before reading. `exchangeRates.schema.ts` validates the history query. The service takes the repository **and an optional sync** — without a sync (or with `RATES_OFFLINE`) reads are DB-only.
- **Offline switch**: `RATES_OFFLINE=1` (or `true`) skips the startup sync and constructs the routes' service without a sync, so reads never touch the provider — used to run fully offline and to keep HTTP tests network-free (the integration test sets it).
- `exchangeRates.catalog.ts` holds `BASE_CURRENCY`, `QUOTE_CURRENCIES`, the provider/timeout constants, `BACKFILL_MONTHS` (startup warm window), `MAX_HISTORY_MONTHS` (max read span), and `DEFAULT_EXCHANGE_RATES` (offline fallback). `seedExchangeRates` seeds today's quotes from the fallback only when the table is empty; the first successful sync overrides them. `migrateSchema` drops the legacy `(from_currency, to_currency, rate)` table and recreates the date-keyed shape.

## AI chat

The `chat` feature turns a natural-language message into a **draft** ledger entry — it only **extracts**; saving reuses `POST /api/ledger`. There is **no table** and no persisted history (the conversation is client-side only). It mirrors the exchange-rates **injectable provider** pattern so tests never load a model.

- **Extractor** (`chat.llm.ts`): `createLedgerExtractor()` returns an `ILedgerExtractor` backed by **`node-llama-cpp`** (inference-only). The native module and GGUF model are loaded **lazily on the first `extract` call** (never at import or app boot), via `resolveModelFile(CHAT_MODEL_URI, modelsDir)` which downloads from Hugging Face if absent (`CHAT_MODEL_URI` defaults to `hf:unsloth/gemma-4-E4B-it-GGUF:Q4_K_M`; `CHAT_MODELS_DIR` overrides `./models`). Output is constrained with a JSON-schema grammar (`llama.createGrammarForJsonSchema`) whose `categorySlug` is an `enum` of the live category slugs (or `null`), so the model can't invent a category; every other field is nullable (`null` = "not stated"). Prompts are serialized through an in-module queue (a context sequence is single-threaded) and run at low temperature. The "tuning" is **prompt/config only** (system prompt + EN/UK few-shot + grammar + sampling) — there is no training pipeline.
- **Service** (`chat.service.ts`): `ChatService(extractor, categoriesRepo)`. Applies defaults for `null` fields (date→today, currency→`UAH`, type→`expense`) and flags each as uncertain; converts the major-unit amount to integer cents; resolves `categorySlug`→`categoryId` against non-deleted categories (never guesses — an unresolved slug yields `categoryId: null` + `unresolvedCategory: true`); merges the model's own `uncertainFields`. Throws `HttpError(CHAT_UNAVAILABLE, 503)` when the extractor is unavailable.
- **Endpoints**: `POST /api/chat/extract` `{ message }` → `{ draft, uncertainFields, unresolvedCategory }` (the `draft` mirrors `CreateLedgerEntryDto`, except `categoryId` may be `null`). `GET /api/chat/status` → `{ available, ready }` (`available` = configured; `ready` = a model file is already on disk) — no model load. `chat.schema.ts` validates the request.
- **Optional / offline**: an empty `CHAT_MODEL_URI` disables the feature (`available:false`; the UI shows a "not configured" notice). The HTTP integration test sets `CHAT_MODEL_URI=''` so the route is exercised **model-free** — the same idea as `RATES_OFFLINE`. The extractor is injected as a fake in the service unit tests, so **no model is ever downloaded or loaded in tests/CI**.

## Shared Utilities

Shared code lives in `src/api/shared/`:

- `database.ts` — singleton SQLite connection, reads `DB_PATH` from env.
- `schema.ts` — `initDb(db)` creates the `categories`, `ledger_entries`, and `exchange_rates` tables (`initSchema`), runs `migrateSchema` (adds late columns; drops/recreates the legacy exchange-rates table), seeds categories from the catalog (`seedCategories`), and seeds today's fallback quotes (`seedExchangeRates`, only when the table is empty). Called once in `app.ts`.
- `logger.ts` — shared logger utility. ALL logging MUST go through this. NEVER use `console.log` or any `console.*` method directly — `no-console` is enforced by ESLint.
- `errors/` — `httpError.ts` (the `HttpError` class with `code` + `httpStatus`), plus `codes.ts` and `messages.ts` constants. Throw `HttpError` from services for expected failures; the error handler maps it to a JSON `{ code, message }` response.
- `middlewares/` — `requestValidator.ts` (Zod validation), `errorHandler.ts` (terminal error → JSON), `notFoundHandler.ts` (404 for unmatched routes), `rateLimiter.ts` (`express-rate-limit`, 60 req/min per IP), `requestLogger.ts` (per-request access log on the response `finish` event; logs method/url/status/duration via `Logger.log`, escalating 5xx to `Logger.error`).

## App middleware stack

`app.ts` wires, in order: `helmet()`, `requestLogger`, `rateLimiter`, `express.json({ limit: '100kb' })`, the `/health` route, feature routers under `/api/*`, then `notFoundHandler` and `errorHandler` last. `x-powered-by` is disabled. The limiter runs before body parsing so throttled requests are rejected without parsing; `express.json` errors (`entity.too.large` → 413, other 4xx → 400) are translated by `errorHandler` into the standard `{ code, message }` shape.

## API testing

General test rules (node:test, real SQLite file, locations) are in the root `CLAUDE.md`. API-specific:

- **HTTP assertions**: Use `supertest` — `request(app).get('/path')` instead of manual `http.Server` + `fetch`.
- **HTTP integration test setup**: `dotenv/config` is only loaded in `index.ts`, so tests must set `DB_PATH` manually before the app module is loaded. Set `process.env['DB_PATH']` at module level (before any imports that transitively load `database.ts`), then use dynamic `import('../../app.js')` inside `before()`. Import `app` as a reference for `request(app)` — do not call `app.listen()`.
- **Unit tests**: Test service logic in isolation by passing mock repository objects.
- **Integration tests are always required.** Unit tests are required whenever the service has logic beyond trivial delegation. (`categories` only delegates `list()` to the repo, so its unit test is minimal; `ledger` has real logic and a full unit suite.)
