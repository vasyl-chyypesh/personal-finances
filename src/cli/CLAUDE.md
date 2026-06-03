# src/cli/CLAUDE.md

Guidance for the CLI xls importer under `src/cli/`. See the root `CLAUDE.md` for project-wide rules (env, naming, hard constraints, tooling, commands).

A command-line importer lives under `src/cli/` (parallel to `src/api/` and `src/ui/`, not an HTTP feature). It reads a legacy Excel `.xls` workbook and creates categories + ledger entries. **Every sheet in the workbook is imported**, each as one month; tabs that aren't budget sheets (no parseable Ukrainian month/year title, or empty) are skipped with a warning.

- **Run**: `npm run import:xls -- <path-to-file.xls> [--locale=uk|en]` (default `uk` — the language the row labels are in). Honors `DB_PATH` from `.env` and reuses the same SQLite db singleton as the API.
- **Library**: SheetJS (`xlsx`), installed from the SheetJS-hosted tarball (the public-npm build carries known advisories). It reads legacy BIFF8 `.xls` — `exceljs` cannot.

## Files

- `xlsParser.ts` — pure: `parseXls(path) → { sheets: ParsedSheet[]; skipped: string[] }`, where each `ParsedSheet` is `{ name, month, year, rows[] }`. Iterates every tab via an internal `parseSheet` helper; a tab with no `!ref` or an unparseable title is collected into `skipped` (not thrown). No db access, so it's unit-testable. Reads cell values and cell comments directly off the worksheet (comments parse by default; do not pass a `cellComments` option — it isn't in SheetJS's TS types).
- `importService.ts` — orchestration: `import(sheet, locale)` handles **one** sheet — resolve each label to a category via the catalog (`resolveCategory`), `findBySlug`-or-create, wipe the target month's date range, then insert, all inside one `db.transaction`. The caller loops it per sheet.
- `importXls.ts` — entry: arg/`--locale` parsing, wiring, warns on skipped tabs, loops `import` over every parsed sheet, then logs a per-month summary plus a totals line via the shared `Logger`.

## Mapping (matches `test_data.xls`)

The sheet has an expense table (`Стаття витрат`) and an income table (`Джерело доходу`), each with a `1..31` day-column header and trailing `РАЗОМ`/`%`/plan columns. Each non-empty, positive day cell → one ledger entry. `type` = expense/income by table; `date` = month/year parsed from the Ukrainian sheet title + the day column; `currency` = fixed `UAH`; `description` = the cell's Excel comment (or null). The category label (leading non-letter prefix stripped and first letter capitalized, e.g. `-електроенергія` → `Електроенергія`) is resolved against `CATEGORY_CATALOG` for the given locale → a bilingual catalog slug, or, if unknown, a slugified single-locale custom category. Only columns whose header is an integer `1..31` are treated as days, so totals/percent/plan columns are ignored. Re-running wipes the month first, so it's idempotent per month. The catalog fully covers `test_data.xls`, so a clean import creates no custom categories.

The catalog and `resolveCategory` are owned by the API — see `src/api/CLAUDE.md` (Categories & i18n).

## Tests

In `src/cli/__tests__/`. `fixture.ts` builds small BIFF8 workbooks in-memory (with comments): `writeFixtureXls` (single April sheet) and `writeMultiSheetFixtureXls` (April + May budget sheets plus a non-budget `Notes` tab to exercise multi-sheet import and skip behavior). `importService.test.ts` uses mock repos. Note `fixture.ts` is a non-`.test.ts` helper, so `tsconfig.build.json` excludes `src/**/__tests__/**` to keep it out of the production build.
