# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
A personal finance manager running locally, backed by a SQLite database. The API is built with Express 5 and TypeScript. A React UI is planned but not yet scaffolded.

## Environment Requirements
- **Node**: >= 25.0.0
- **Module system**: ESM only (`"type": "module"` in package.json). NEVER use CommonJS `require()`.
- **Runtime env vars** (defined in `.env`):
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
Every new API feature lives in `src/api/<feature-name>/` with exactly these files:
- `<feature>.routes.ts`
- `<feature>.schema.ts`
- `<feature>.service.ts`
- `<feature>.repository.ts`
- `<feature>.types.ts`
- `<feature>.test.ts`

### Request Validation
Use `requestValidator<T>(schema, source?)` from `src/api/shared/middlewares/requestValidator.ts` as route middleware. It validates the request against a Zod schema and stores the transformed result in `res.locals[source]` (default source: `body`). Route handlers read validated data from `res.locals.body`, `res.locals.query`, or `res.locals.params`.

```ts
router.post('/', requestValidator(CreateSchema), (req, res, next) => {
  res.status(201).json(service.create(res.locals.body as CreateDto));
});

router.get('/:id',
  requestValidator(IdParamSchema, RequestSource.params),
  (req, res, next) => {
    const { id } = res.locals.params as { id: number };
    res.json(service.findById(id));
  }
);
```

### App entrypoint
`src/api/app.ts` exports the configured Express `app` as default. `src/api/index.ts` imports it and calls `app.listen()`. Tests that exercise HTTP routes import `app.ts` directly.

### Shared Utilities
Shared code lives in `src/api/shared/`:
- `database.ts` — singleton SQLite connection, reads `DB_PATH` from env.
- `logger.ts` — shared logger utility. ALL logging MUST go through this. NEVER use `console.log` or any `console.*` method directly — `no-console` is enforced by ESLint.

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
- **Both types are required** for every feature.

## Common Commands
- `npm run dev:api` — start API dev server (tsx watch)
- `npm run dev:ui` — start React UI dev server (not yet scaffolded)
- `npm test` — run all tests
- `npm run lint` — run ESLint
- `npm run lint:files` — run ls-lint (file naming linter, separate from ESLint)
- `npm run format` — run Prettier
- `npm run build` — compile TypeScript to `dist/`
- `npm start` — run compiled production build from `dist/`
- `npm run scan:security` — run Bearer security scanner (requires Docker)
- `npm run scan:security:report` — same, outputs an HTML report to `scan-report.html`

## Tooling
- **ESLint**: `eslint:recommended` + `@typescript-eslint/recommended` + `security/recommended-legacy`. Security plugin is active — avoid `eval`, dynamic `require`, and prototype pollution patterns.
- **Prettier**: formatting enforced, run before committing.
- **ls-lint**: file naming linter.
- **husky**: runs `npm run lint` + `npm run lint:files` on pre-commit; runs commitlint on commit-msg.
- **CI/CD**: GitHub Actions runs linters and tests on every push.
