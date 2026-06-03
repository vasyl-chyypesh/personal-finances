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

`GET /api/exchange-rates` returns `{ base: 'UAH', rates }` where `rates[from][to]` is the full pairwise conversion matrix. Rates are **DB-backed**: stored in the `exchange_rates` table (`(from_currency, to_currency, rate)`, PK on the pair) and read back into the matrix by `exchangeRates.repository.ts`. `exchangeRates.catalog.ts` holds `BASE_CURRENCY` and `DEFAULT_EXCHANGE_RATES` (the verbatim pairs, e.g. `EUR→USD = 1.16`, not derived), which `seedExchangeRates` inserts only when the table is empty — so editing stored rates survives restarts. The feature has no `schema.ts` (no input) and no write route yet.

## Shared Utilities

Shared code lives in `src/api/shared/`:

- `database.ts` — singleton SQLite connection, reads `DB_PATH` from env.
- `schema.ts` — `initDb(db)` creates the `categories`, `ledger_entries`, and `exchange_rates` tables (`initSchema`), seeds categories from the catalog (`seedCategories`), and seeds the conversion matrix (`seedExchangeRates`, only when the table is empty). Called once in `app.ts`.
- `logger.ts` — shared logger utility. ALL logging MUST go through this. NEVER use `console.log` or any `console.*` method directly — `no-console` is enforced by ESLint.
- `errors/` — `httpError.ts` (the `HttpError` class with `code` + `httpStatus`), plus `codes.ts` and `messages.ts` constants. Throw `HttpError` from services for expected failures; the error handler maps it to a JSON `{ code, message }` response.
- `middlewares/` — `requestValidator.ts` (Zod validation), `errorHandler.ts` (terminal error → JSON), `notFoundHandler.ts` (404 for unmatched routes), `rateLimiter.ts` (`express-rate-limit`, 60 req/min per IP).

## App middleware stack

`app.ts` wires, in order: `helmet()`, `express.json()`, `rateLimiter`, the `/health` route, feature routers under `/api/*`, then `notFoundHandler` and `errorHandler` last. `x-powered-by` is disabled.

## API testing

General test rules (node:test, real SQLite file, locations) are in the root `CLAUDE.md`. API-specific:

- **HTTP assertions**: Use `supertest` — `request(app).get('/path')` instead of manual `http.Server` + `fetch`.
- **HTTP integration test setup**: `dotenv/config` is only loaded in `index.ts`, so tests must set `DB_PATH` manually before the app module is loaded. Set `process.env['DB_PATH']` at module level (before any imports that transitively load `database.ts`), then use dynamic `import('../../app.js')` inside `before()`. Import `app` as a reference for `request(app)` — do not call `app.listen()`.
- **Unit tests**: Test service logic in isolation by passing mock repository objects.
- **Integration tests are always required.** Unit tests are required whenever the service has logic beyond trivial delegation. (`categories` only delegates `list()` to the repo, so its unit test is minimal; `ledger` has real logic and a full unit suite.)
