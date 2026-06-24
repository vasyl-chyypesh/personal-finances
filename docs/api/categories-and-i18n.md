# Categories & i18n (API / data side)

> Feature internals extracted from `src/api/CLAUDE.md`. That guide holds the
> conventions; this file holds the per-feature detail. The UI rendering half of
> i18n lives in `src/ui/CLAUDE.md`.

Categories are **language-neutral with bilingual names**. The `categories` table
is `(id, slug, names)` where `slug` is the stable identity and `names` is a JSON
blob like `{"en":"Charity","uk":"Благодійність"}` (at least one locale; supported
locales are `en` and `uk`).

- `src/api/categories/categories.catalog.ts` — `CATEGORY_CATALOG`, the canonical
  bilingual list (the `uk` value matches the xls parser's normalized labels). It
  is **both** the seed set (`seedCategories` inserts all of it) and the import
  mapping source. `resolveCategory(label, locale)` maps a label to a catalog
  `{ slug, names }`, falling back to a slugified single-locale category for
  unknown labels.
- `categories` is **writable**: `PATCH /api/categories/:id` with
  `{ names: { en?, uk? } }` merges translations (used to fill a missing-language
  name). `GET /api/categories` returns `{ id, slug, names }`; ledger entries embed
  the same category shape. The API returns **all translations** — the UI picks the
  active locale client-side. API error messages remain English.

The catalog is also consumed by the importer — see `src/cli/CLAUDE.md`.
