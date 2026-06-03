# src/ui/CLAUDE.md

Guidance for the React UI under `src/ui/`. See the root `CLAUDE.md` for project-wide rules (env, naming, hard constraints, tooling, commands).

The frontend is a **Vite + React 19 + TypeScript** single-page app. It is fully separate from the API: it never imports server modules (which pull in `better-sqlite3`) and talks to the backend only over HTTP.

- **Dev server**: `npm run dev:ui` runs Vite on `:5173` and proxies `/api/*` to the API on `:3001` (`server.proxy` in `vite.config.ts`). Run `dev:api` and `dev:ui` together.
- **Styling**: Tailwind CSS v4 via the `@tailwindcss/vite` plugin. There is **no** `tailwind.config.js` / PostCSS config — Tailwind is enabled by `@import "tailwindcss";` in `src/ui/index.css`. Style with utility classes.
- **Build config**: the UI has its own browser-targeted `src/ui/tsconfig.json` (`jsx: react-jsx`, DOM libs, `moduleResolution: bundler`, `allowImportingTsExtensions`). It is excluded from the API's `tsconfig.json` / `tsconfig.build.json` so `npm run build` (API) never compiles browser code. `npm run build:ui` produces a static bundle in `dist/ui`.

## Structure (under `src/ui/`)

- `main.tsx` — React entry; `App.tsx` — page composition.
- `types.ts` — browser-side mirror of the API domain types (kept in sync manually; do NOT import from `src/api`).
- `lib/client.ts` — typed `fetch` wrapper; throws `ApiError` from the `{ code, message }` error body. (Note: UI source must NOT live under a `src/ui/api/` directory — the Vite `/api` proxy prefix would intercept those module URLs and break the app.)
- `hooks/` — `useCategories.ts`, `useLedger.ts`, `useExchangeRates.ts` (data fetching with `useState`/`useEffect`; no TanStack Query or other state lib).
- `components/` — `PascalCase.tsx` presentational/feature components.
- `pages/` — `PascalCase.tsx` top-level page views.

## UI i18n (rendering side)

The categories data model and API live on the server — see `src/api/CLAUDE.md`. The UI picks the active locale client-side and resolves display strings. UI i18n lives in `src/ui/i18n/`:

- `messages.ts` — flat `en`/`uk` string catalogs.
- `i18nContext.ts` — `I18nContext` + `useI18n()` hook.
- `I18nProvider.tsx` — provider; locale persisted to `localStorage`, initialized from `navigator.language`.
- `categoryName.ts` — resolves a category's display name: active locale → other locale → slug.
- `LanguageSwitcher.tsx` — toggles the locale.

Components call `t(key, vars?)` (with `{name}` interpolation) — no hard-coded display strings.

## Linting

A dedicated ESLint flat-config block targets `src/ui/**/*.{ts,tsx}` (JSX + browser globals + `react-hooks` rules); the API block is scoped to `src/api/**/*.ts`. `no-console` applies to the UI too — there is no shared logger in the browser, so avoid `console.*` in committed code.

## Testing

General test rules (node:test, `.test.ts` suffix) are in the root `CLAUDE.md`. Pure browser utilities are unit-tested with `node:test` the same way the API is — see `src/ui/lib/__tests__/pivot.test.ts`.
