# Ledger — known issues / TODO

Outstanding findings from the API review. Ordered by severity.

## 1. Money is stored as floating-point `REAL` (high)

`amount` is a SQLite `REAL` (`shared/schema.ts`) and Zod only enforces
`z.number().positive()` (`ledger.schema.ts`). IEEE-754 doubles can't represent
most decimal amounts exactly, so sums drift and currency conversion through the
exchange-rate matrix compounds the error.

- [ ] Store amounts as integer minor units (cents) — `INTEGER` column.
- [ ] Validate `z.number().int()` (or a fixed-scale decimal string) on input.
- [ ] Add a migration to convert existing `REAL` values, and update the
      repository mapping + API response shape.

## 2. `GET /api/ledger` silently ignores `year`/`month` unless **both** are present (high)

`ledger.service.ts`: `const anchor = year && month ? new Date(...) : new Date()`.
The schema makes `year` and `month` independently optional, but the service only
honors them together, so e.g. `?period=year&year=2023` is silently ignored and
returns the _current_ year instead of 2023. Valid-looking input → wrong data,
no error.

- [ ] Decide the contract: either require both together in the schema, or honor
      each independently (default the missing one).
- [ ] Cover the partial cases (`year` only, `month` only) with tests — currently
      only "both" and "neither" are tested.

## 3. Date validation accepts impossible calendar dates (high)

`ledger.schema.ts`: `date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)` checks shape
only. `2026-13-45`, `2026-02-30`, `2026-00-00` all pass and get persisted. Since
all filtering is lexicographic string comparison, garbage dates silently fall in
or out of ranges and can't be corrected by normal querying.

- [ ] Validate a real calendar date (e.g. `z.iso.date()` in Zod 4, or refine by
      constructing a `Date` and comparing back).

## 7. No pagination on `GET /api/ledger` (medium)

`ledger.repository.ts` `findByDateRange` returns the entire range unbounded.
`period=year` over years of imported xls data returns everything in one response.

- [ ] Add limit/offset or cursor pagination to the list endpoint and repository.
