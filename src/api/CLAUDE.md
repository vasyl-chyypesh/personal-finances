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

## Feature internals

Conventions live here; each feature's deep-dive (data model, provider wiring,
endpoint contracts, offline switches) lives in `docs/api/`. Read the matching doc
before changing that feature — keep it in sync when the behavior changes.

- **Categories & i18n** — language-neutral categories with bilingual `{en,uk}`
  names; the `CATEGORY_CATALOG` is both seed set and import mapping source, and
  `categories` is writable via `PATCH`. → [`docs/api/categories-and-i18n.md`](../../docs/api/categories-and-i18n.md). The UI rendering half of i18n lives in `src/ui/CLAUDE.md`; the catalog is also consumed by the importer (`src/cli/CLAUDE.md`).
- **Exchange rates** — date-keyed `(date, base, quote, rate)` rows from a
  Frankfurter v2 provider; the full pairwise matrix is **derived**, sync is
  best-effort and kept out of `app.ts`, and `RATES_OFFLINE` makes reads DB-only.
  → [`docs/api/exchange-rates.md`](../../docs/api/exchange-rates.md).
- **AI chat** — extracts a **draft** ledger entry from natural language via a local
  Ollama daemon behind an injectable provider; no table, no persisted history, and
  an empty `CHAT_MODEL` disables it. → [`docs/api/ai-chat.md`](../../docs/api/ai-chat.md).

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
