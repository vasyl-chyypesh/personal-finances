# src/ui/CLAUDE.md

Guidance for the React UI under `src/ui/`. See the root `CLAUDE.md` for project-wide rules (env, naming, hard constraints, tooling, commands).

The frontend is a **Vite + React 19 + TypeScript** single-page app. It is fully separate from the API: it never imports server modules (which pull in `better-sqlite3`) and talks to the backend only over HTTP.

- **Dev server**: `npm run dev:ui` runs Vite on `:5173` and proxies `/api/*` to the API on `:3001` (`server.proxy` in `vite.config.ts`). Run `dev:api` and `dev:ui` together.
- **Styling**: Tailwind CSS v4 via the `@tailwindcss/vite` plugin. There is **no** `tailwind.config.js` / PostCSS config — Tailwind is enabled by `@import "tailwindcss";` in `src/ui/index.css`, which also holds the `@theme` design tokens (see below). Style with utility classes.
- **Build config**: the UI has its own browser-targeted `src/ui/tsconfig.json` (`jsx: react-jsx`, DOM libs, `moduleResolution: bundler`, `allowImportingTsExtensions`). It is excluded from the API's `tsconfig.json` / `tsconfig.build.json` so `npm run build` (API) never compiles browser code. `npm run build:ui` produces a static bundle in `dist/ui`.

## Structure (under `src/ui/`)

- `main.tsx` — React entry; wraps the app in `ThemeProvider` → `I18nProvider` → `ErrorBoundary` → `BrowserRouter`.
- `app/` — shell and cross-cutting providers: `App.tsx` (routing), `AppLayout.tsx` (sidebar + scrollable main `<Outlet/>`), `Sidebar.tsx` (nav + theme/locale toggles), `ErrorBoundary.tsx` (reusable; `inline` mode for page-level use), `ThemeProvider.tsx` / `themeContext.ts`.
- `pages/` — `PascalCase.tsx` top-level views, one per route: `LedgerPage`, `CategoriesPage`, `CurrenciesPage`. Routes: `/` → `/ledger`, plus `/categories`, `/currencies`.
- `components/` — `PascalCase.tsx` presentational/feature components (flat). `AmountDisplay` is the single source of truth for rendering money. `icons.tsx` holds inline SVG icons (no icon dependency).
- `hooks/` — data + URL state (see **Server state** below).
- `lib/` — framework-agnostic helpers: `client.ts` (typed `fetch` wrapper; throws `ApiError` from the `{ code, message }` body), `money.ts` (integer-cent ↔ major), `datePeriod.ts` (UTC period math, Monday weeks), `currencyMeta.ts` (flags/names + `convertCents`), `categoryStyle.ts` (deterministic color/glyph from a category slug).
- `styles/tokens.ts` — the canonical TypeScript design tokens (colors, type scale, spacing, radius, z-index). Mirrored into Tailwind utilities by the `@theme` block in `index.css`. Import from here only when a token is needed in TS (e.g. an inline `style` color); prefer Tailwind classes in markup.
- `types.ts` — browser-side mirror of the API domain types (kept in sync manually; do NOT import from `src/api`). This is the UI's API contract.

> Note: UI source must NOT live under a `src/ui/api/` directory — the Vite `/api` proxy prefix would intercept those module URLs and break the app.

## Server state (hooks)

There is **no TanStack Query or other state lib** — server state is plain `useState`/`useEffect` inside hooks under `hooks/`. **No component calls `fetch`/`client` directly**; every API call goes through a hook:

- `useLedger(year)` — fetches a full calendar **year** in one request, then pages filter client-side by period/category/type (the API only takes a period+anchor range, so fetching the year is what makes arbitrary Monday-week navigation correct without new endpoints). Edits/deletes are **optimistic with rollback** on failure.
- `useLedgerRecord(records, id)` — resolves a single record from already-loaded data (there is no `GET /api/ledger/:id` endpoint).
- `useCategories(includeDeleted?)` — list + create/rename/remove/restore; rename/remove are optimistic.
- `useCurrencies()` — base currency, the pairwise rates matrix, and freshness (`asOf`/`stale`); read-only. `useRatesHistory({from?,to?})` — base-per-unit time series for the `RateHistoryChart` (inline-SVG, no chart dependency) on `CurrenciesPage`. `useCurrencyChartParams()` — the chart's rolling-range preset (`1m/3m/6m/ytd/1y`, via `lib/rateRange.ts`) and visible series (USD/EUR, ≥1), persisted in URL search params like the ledger filters; the page derives `{from,to}` from the preset and the chart legend toggles series.
  - `RateHistoryChart` renders at **real pixel dimensions** (no `preserveAspectRatio` stretching): `hooks/useElementWidth.ts` (`ResizeObserver`) gives the container width so SVG text/dots aren't distorted. Axis ticks come from `lib/chartScale.ts` (pure, unit-tested) — `niceScale` for round Y gridlines/labels, `monthStartIndices` + `tickIndices` for X date ticks snapped to month boundaries (so labels never repeat), `nearestIndex` to map the cursor to a point. Date labels are locale-aware via `Intl` and adaptive to the span (day / month / month+year). Hover (`onPointerMove`) draws a dashed crosshair, a dot per visible series, and an HTML tooltip overlay (date + each visible rate) that flips sides near the right edge.
- `useLedgerFilters()` — ledger filter/sort/view state lives in **URL search params** (shareable/bookmarkable), via react-router's `useSearchParams`.

Money is always integer **minor units (cents)** end to end; convert to display only in `AmountDisplay` (via `Intl`, never `.toFixed()`). Mixed-currency totals are converted to the base currency (UAH) with `convertCents`. Date/period comparisons use UTC (`lib/datePeriod.ts`).

Errors surface two ways: a recoverable in-page state (retry) for failed fetches, and a page-level `ErrorBoundary` (`inline`) wrapping each route in `App.tsx` so a render error never blanks the app.

## UI i18n (rendering side)

The categories data model and API live on the server — see `src/api/CLAUDE.md`. The UI picks the active locale client-side and resolves display strings. UI i18n lives in `src/ui/i18n/`:

- `messages.ts` — flat `en`/`uk` string catalogs.
- `i18nContext.ts` — `I18nContext` + `useI18n()` hook.
- `I18nProvider.tsx` — provider; locale persisted to `localStorage`, initialized from `navigator.language`.
- `categoryName.ts` — resolves a category's display name: active locale → other locale → slug.

The locale and theme toggles live in `app/Sidebar.tsx` (not under `i18n/`). Components call `t(key, vars?)` (with `{name}` interpolation) — no hard-coded display strings.

## Linting & formatting

A dedicated ESLint flat-config block targets `src/ui/**/*.{ts,tsx}` (JSX + browser globals + `react-hooks` rules); the API block is scoped to `src/api/**/*.ts`. `no-console` applies to the UI too — there is no shared logger in the browser, so avoid `console.*` in committed code.

Run `npm run format` (Prettier, writes) before committing UI changes — long Tailwind `className` strings and multi-import lists routinely exceed the print width and need rewrapping. CI runs `npm run format:check`, so unformatted files fail the build; the husky pre-commit hook runs ESLint + ls-lint but **not** Prettier, so formatting won't be caught locally on commit. Also avoid `*/` inside CSS comments in `index.css` — Prettier mangles the block.

## Testing

General test rules (node:test, `.test.ts` suffix) are in the root `CLAUDE.md`. Pure browser utilities are unit-tested with `node:test` the same way the API is — see `src/ui/lib/__tests__/money.test.ts`.
