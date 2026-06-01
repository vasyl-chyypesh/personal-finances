# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A personal finance manager running locally, backed by a SQLite database. The API is built with Express 5 and TypeScript. A React UI is planned but not yet scaffolded.

## Environment Requirements

- **Node**: >= 25.0.0
- **Module system**: ESM only (`"type": "module"` in package.json). NEVER use CommonJS `require()`.
- **Runtime env vars** (defined in `.env`; copy `.env.example` to start):
  - `DB_PATH` — path to the SQLite database file (e.g. `finance.db`)
  - `PORT` — API port (default `3001`)

## Architecture

The codebase is under `src/`. The API follows a strict layered architecture:

```
Routes → Services → Repositories
```

- **Routes** (`*.routes.ts`): HTTP handlers, response shaping. Instantiates its own service using the shared db singleton and exports `default router` (not a factory function). Uses `requestValidator` middleware for input validation. MUST NOT import Repositories directly.
- **Schemas** (`*.schema.ts`): Zod schemas for a feature's routes. Imported by routes and passed to `requestValidator`.
- **Services** (`*.service.ts`): Business logic and orchestration. MUST NOT import Routes.
- **Repositories** (`*.repository.ts`): All SQLite queries and data mapping. MUST NOT import Services or Routes.
- **Types** (`*.types.ts`): Shared domain models and TypeScript interfaces for the feature.

### API Feature Structure

Every new API feature lives in `src/api/<feature-name>/`:

- `<feature>.routes.ts`
- `<feature>.schema.ts` — only when the feature accepts input (body/query/params) to validate. A read-only feature with no input (e.g. `categories`) has no schema file.
- `<feature>.service.ts`
- `<feature>.repository.ts`
- `<feature>.types.ts`
- `__tests__/` — feature tests live here, split into:
  - `<feature>.int.test.ts` — HTTP integration tests (always required)
  - `<feature>.test.ts` — service unit tests (required when the service has logic worth isolating)

Cross-cutting HTTP tests that span features live in `src/api/__tests__/`.

### Request Validation

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

### App entrypoint

`src/api/app.ts` exports the configured Express `app` as default. `src/api/index.ts` imports it and calls `app.listen()`. Tests that exercise HTTP routes import `app.ts` directly.

### Shared Utilities

Shared code lives in `src/api/shared/`:

- `database.ts` — singleton SQLite connection, reads `DB_PATH` from env.
- `schema.ts` — `initDb(db)` creates the `categories` and `ledger_entries` tables (`initSchema`) and seeds predefined categories (`seedCategories`). Called once in `app.ts`.
- `logger.ts` — shared logger utility. ALL logging MUST go through this. NEVER use `console.log` or any `console.*` method directly — `no-console` is enforced by ESLint.
- `errors/` — `httpError.ts` (the `HttpError` class with `code` + `httpStatus`), plus `codes.ts` and `messages.ts` constants. Throw `HttpError` from services for expected failures; the error handler maps it to a JSON `{ code, message }` response.
- `middlewares/` — `requestValidator.ts` (Zod validation), `errorHandler.ts` (terminal error → JSON), `notFoundHandler.ts` (404 for unmatched routes), `rateLimiter.ts` (`express-rate-limit`, 60 req/min per IP).

### App middleware stack

`app.ts` wires, in order: `helmet()`, `express.json()`, `rateLimiter`, the `/health` route, feature routers under `/api/*`, then `notFoundHandler` and `errorHandler` last. `x-powered-by` is disabled.

## Hard Constraints

- **No `console.*`**: Use the shared logger (`src/api/shared/logger.ts`). Violating this will fail the pre-commit ESLint hook.
- **No `any` without justification**: `@typescript-eslint/no-explicit-any` is a warning. Avoid it; use proper types.
- **Commit messages MUST follow Conventional Commits** (e.g. `feat:`, `fix:`, `chore:`). commitlint enforces this via husky on every commit.
- **Layer imports**: Routes → Services → Repositories only. Cross-layer imports in the wrong direction will be rejected in review.

## Naming Conventions

- **Files**: `camelCase` for `.ts` files; `PascalCase` for class and type definition files.
- **Tests**: Must use `.test.ts` suffix.

## Testing Strategy

- **Test runner**: Native `node:test` and `node:assert`. Do NOT use Jest, Vitest, or any other test runner.
- **HTTP assertions**: Use `supertest` — `request(app).get('/path')` instead of manual `http.Server` + `fetch`.
- **Integration tests**: Use a real SQLite file (e.g. `test.db`). Create it before the test suite and delete it after. Do NOT use `:memory:` — tests should reflect real file-based behavior.
- **HTTP integration test setup**: `dotenv/config` is only loaded in `index.ts`, so tests must set `DB_PATH` manually before the app module is loaded. Set `process.env['DB_PATH']` at module level (before any imports that transitively load `database.ts`), then use dynamic `import('../../app.js')` inside `before()`. Import `app` as a reference for `request(app)` — do not call `app.listen()`.
- **Unit tests**: Test service logic in isolation by passing mock repository objects.
- **Integration tests are always required.** Unit tests are required whenever the service has logic beyond trivial delegation. (`categories` only delegates `list()` to the repo, so its unit test is minimal; `ledger` has real logic and a full unit suite.)
- **Test file locations**: see "API Feature Structure" above — tests live in the feature's `__tests__/` directory, not alongside the source files.

## Common Commands

- `npm run dev:api` — start API dev server (tsx watch)
- `npm run dev:ui` — start React UI dev server (not yet scaffolded)
- `npm test` — run all tests
- `npm run lint` — run ESLint
- `npm run lint:files` — run ls-lint (file naming linter, separate from ESLint)
- `npm run format` — run Prettier (writes changes)
- `npm run format:check` — verify formatting without writing (used in CI)
- `npm run build` — compile TypeScript to `dist/`
- `npm start` — run compiled production build from `dist/`
- `npm run scan:security` — run Bearer security scanner (requires Docker)
- `npm run scan:security:report` — same, outputs an HTML report to `scan-report.html`

## Tooling

- **ESLint**: `eslint:recommended` + `@typescript-eslint/recommended` + `security/recommended-legacy`. Security plugin is active — avoid `eval`, dynamic `require`, and prototype pollution patterns.
- **Prettier**: formatting enforced, run before committing.
- **ls-lint**: file naming linter.
- **husky**: runs `npm run lint` + `npm run lint:files` on pre-commit; runs commitlint on commit-msg.
- **CI/CD**: GitHub Actions runs ls-lint, ESLint, `format:check`, build, and tests, plus a Bearer security scan, on every push and PR to `main`.
