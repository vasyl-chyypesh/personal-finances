# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. It covers project-wide concerns; each part of `src/` has its own nested `CLAUDE.md` with detailed guidance (see **Directory guides** below).

## Project Overview

A personal finance manager running locally, backed by a SQLite database. The API is built with Express 5 and TypeScript. The UI is a React 19 single-page app built with Vite and Tailwind CSS v4, served separately and proxying `/api` to the Express server.

## Environment Requirements

- **Node**: >= 25.0.0
- **Module system**: ESM only (`"type": "module"` in package.json). NEVER use CommonJS `require()`.
- **Runtime env vars** (defined in `.env`; copy `.env.example` to start):
  - `DB_PATH` — path to the SQLite database file (e.g. `finance.db`)
  - `PORT` — API port (default `3001`)

## Architecture

All code lives under `src/`, split into three independent parts:

- `src/api/` — Express 5 + TypeScript HTTP API, layered `Routes → Services → Repositories`, backed by SQLite.
- `src/ui/` — Vite + React 19 SPA; talks to the API only over HTTP (never imports server modules).
- `src/cli/` — a standalone xls importer (not an HTTP feature) that loads a legacy Excel budget sheet into the db.

## Directory guides

When working inside a part, read its nested `CLAUDE.md` for the detailed conventions:

| File                                     | Scope                                                                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| [`src/api/CLAUDE.md`](src/api/CLAUDE.md) | Express API: layers, request validation, app/middleware wiring, shared utils, categories & i18n data model, API testing. |
| [`src/ui/CLAUDE.md`](src/ui/CLAUDE.md)   | React/Vite SPA: structure, Tailwind v4 setup, build config, UI i18n, UI linting.                                         |
| [`src/cli/CLAUDE.md`](src/cli/CLAUDE.md) | xls importer: parser, import service, mapping spec, run command.                                                         |

## Hard Constraints

- **No `console.*`**: Use the shared logger (`src/api/shared/logger.ts`). In the browser there is no logger, so avoid `console.*` there too. Violating this will fail the pre-commit ESLint hook.
- **No `any` without justification**: `@typescript-eslint/no-explicit-any` is a warning. Avoid it; use proper types.
- **Commit messages MUST follow Conventional Commits** (e.g. `feat:`, `fix:`, `chore:`). commitlint enforces this via husky on every commit.
- **Layer imports** (API): Routes → Services → Repositories only. Cross-layer imports in the wrong direction will be rejected in review.

## Naming Conventions

- **Files**: `camelCase` for `.ts` files; `PascalCase` for class and type definition files. React components are `PascalCase.tsx`; UI hook/util/type files are `camelCase.ts` (ls-lint enforces `.tsx: camelCase | PascalCase`).
- **Tests**: Must use `.test.ts` suffix.

## Testing Strategy

Project-wide rules (part-specific details — supertest, the `DB_PATH` HTTP setup, mock repos, UI util tests — are in the nested guides):

- **Test runner**: Native `node:test` and `node:assert`. Do NOT use Jest, Vitest, or any other test runner.
- **Integration tests**: Use a real SQLite file (e.g. `test.db`). Create it before the test suite and delete it after. Do NOT use `:memory:` — tests should reflect real file-based behavior.
- **Test file locations**: tests live in the feature's `__tests__/` directory, not alongside the source files.
- **Integration tests are always required.** Unit tests are required whenever a service has logic beyond trivial delegation. See `src/api/CLAUDE.md` for the API testing specifics.

## Common Commands

- `npm run dev:api` — start API dev server (tsx watch)
- `npm run dev:ui` — start the React UI dev server (Vite on `:5173`, proxies `/api` to `:3001`)
- `npm run import:xls -- <file.xls>` — import a legacy Excel budget sheet into the SQLite db
- `npm test` — run all tests
- `npm run lint` — run ESLint
- `npm run lint:files` — run ls-lint (file naming linter, separate from ESLint)
- `npm run format` — run Prettier (writes changes)
- `npm run format:check` — verify formatting without writing (used in CI)
- `npm run build` — compile the API TypeScript to `dist/` (excludes `src/ui`)
- `npm run build:ui` — build the production UI bundle to `dist/ui`
- `npm run preview:ui` — preview the built UI bundle locally
- `npm start` — run compiled production build from `dist/`
- `npm run scan:security` — run Bearer security scanner (requires Docker)
- `npm run scan:security:report` — same, outputs an HTML report to `scan-report.html`

## Tooling

- **ESLint**: `eslint:recommended` + `@typescript-eslint/recommended` + `security/recommended-legacy`. Security plugin is active — avoid `eval`, dynamic `require`, and prototype pollution patterns.
- **Prettier**: formatting enforced, run before committing.
- **ls-lint**: file naming linter.
- **husky**: runs `npm run lint` + `npm run lint:files` on pre-commit; runs commitlint on commit-msg.
- **CI/CD**: GitHub Actions runs ls-lint, ESLint, `format:check`, build, and tests, plus a Bearer security scan, on every push and PR to `main`.
