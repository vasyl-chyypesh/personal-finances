---
name: review-finances
description: Deep code review of personal-finances changes for security vulnerabilities, race conditions, and logic bugs. Use to review, audit, or security-review the current branch, working-tree changes, or a GitHub PR before merge — grounded in this repo's layered API, SQLite, and integer-cents money conventions.
---

# review-finances

A focused, manual deep review for **correctness and security** bugs in this
repo: injection, broken validation, authorization/exposure, race conditions
(TOCTOU), money/rounding errors, and logic mistakes. It complements — does
not replace — the built-in `/code-review` (general diff review) and
`/security-review`; reach for those for a broad pass, and this skill when you
want a rigorous, project-aware audit of the changed code.

Paths are relative to the repo root.

## Usage

Invoked by description — ask to review, audit, or security-review the current
branch, working-tree changes, or a GitHub PR before merge. Work through the
three steps below in order: **gather scope** (Step 1), **review against the
four lenses** (Step 2), then **report** the findings (Step 3).

## Step 1 — gather scope

Run the scope script. It prints the diffstat, the layers touched, heuristic
risk flags, and the full diff — your reading material:

```bash
.claude/skills/review-finances/scope.sh            # branch vs main + working tree
.claude/skills/review-finances/scope.sh <base-ref> # against another base
.claude/skills/review-finances/scope.sh <PR-number> # checks out & reviews a GitHub PR (needs gh)
```

Read the **full diff**, and open the surrounding code for any changed
function — a bug is often in how new code interacts with unchanged code
(e.g. a service that skips a check the repository assumed).

## Step 2 — review against these four lenses

Go through every lens for the changed code. Treat the risk flags from the
script as leads, not conclusions.

### 1. Security / vulnerabilities
- **SQL injection.** Every value must be a `?` placeholder bound via
  `.run()/.get()/.all()`. Template-string SQL is only acceptable for
  **column/identifier lists built from code constants** (see the whitelisted
  `fields` array in `ledger.repository.ts` `update`) — never for values, never
  from request data. Flag any `prepare(\`...${x}...\`)` where `x` could carry
  user input.
- **Input validation.** Every route input (body/query/params) must pass
  through a Zod schema via `requestValidator`. New fields need bounds:
  strings need `.max()` (today `description` and category names have **no max**
  — only the 100kb body cap), numbers need sane `.min()/.max()`. Unvalidated
  input reaching a service or SQL is a finding.
- **Information exposure.** `errorHandler` must keep returning the generic
  `{ code, message }` shape — never the raw `error.message`/stack to the
  client for 5xx. Internal details go to `Logger.error` only.
- **Untrusted parsing.** `JSON.parse(row.names)` trusts DB contents; if a code
  path now writes `names` from user input without `JSON.stringify` of a
  validated object, that trust breaks.
- **DoS / limits.** Don't weaken `helmet`, the 60-req/min rate limiter, or the
  `express.json({ limit: '100kb' })` cap. Unbounded loops/queries over
  user-controlled counts are findings.
- **No auth by design** (local app). So treat anything that would widen the
  surface — binding beyond localhost, shelling out, dynamic `require`, writing
  arbitrary file paths — as high severity.

### 2. Race conditions / concurrency
- **better-sqlite3 is synchronous.** Within one request handler, two DB calls
  cannot be interleaved by another request (single-threaded, no yield). That
  safety **evaporates the moment an `await` appears between two DB
  operations** in a service — that reintroduces a real TOCTOU window. The
  scope script flags new `await` in services; scrutinize each.
- **Cross-process races are real.** The CLI importer (`src/cli`) and the API
  can run against the same DB file (WAL mode). A read-modify-write that's safe
  single-process can still interleave across processes.
- **Read-modify-write must be transactional.** Multi-statement mutations that
  depend on a prior read (e.g. `reorder` reassigning `sort_order`, or merging
  `names`) belong in `db.transaction(() => …)()`. `reorder` already does this;
  new bulk mutations should too.
- **TOCTOU on soft-deletes.** `LedgerService.create/update` check
  `category.deletedAt` before writing. Any new path that references a category
  by id must do the same check, and be aware the category could change between
  check and use if an `await` is introduced.

### 3. Correctness / logic
- **Money is integer cents.** Amounts are `z.number().int().positive()` with
  **no upper bound** — watch for overflow past `Number.MAX_SAFE_INTEGER` and
  for any float math (`parseFloat`, `* 100`, `toFixed`) that should go through
  `src/ui/lib/money.ts` (`majorToCents`/`centsToMajor`). Rounding direction
  matters.
- **Date logic.** Dates are `'YYYY-MM-DD'` strings compared lexicographically
  (valid only because they're zero-padded ISO). `getDateRange` /
  `list` anchor math (Monday-based weeks, month day-0 trick, `month` 1–12 →
  0–11) is a classic off-by-one hotspot. Check boundaries: first/last day,
  year rollover, `month=12`, week spanning a month edge.
- **Partial updates.** `UpdateSchema` is `.partial()`; the repo builds the SQL
  `SET` list field-by-field. Verify a newly added field is wired in **both**
  the schema and the repository update, and that `undefined` vs `null` is
  handled (omit vs clear).
- **Existence & status checks.** Service mutations check existence and throw
  the right `HttpError` (404 vs 400 vs 409). New mutations need the same
  guards; `reorder` silently no-ops unknown ids — decide if that's intended.
- **Error codes.** Use the `CODES`/`MESSAGES` constants and the correct HTTP
  status; don't invent ad-hoc strings.

### 4. Project conventions (will block merge if violated)
- **Layer direction:** Routes → Services → Repositories only. A service
  importing a route, or a route importing a repository, is a finding.
- **No `console.*`** — `Logger` in the API, nothing in the UI.
- **Tests required:** a changed service/repository needs a touched
  `__tests__/*.test.ts`; integration tests are mandatory, unit tests when the
  service has real logic. The scope script flags the missing-test case.
- **Conventional Commits** on every commit; **i18n** category names stay
  bilingual `{en?,uk?}`; UI strings go through `t()`.

## Step 3 — report

Produce findings ordered by severity. For each:

```
[SEVERITY] file:line — one-line title
  What: the bug and the exact trigger/input.
  Why:  the impact (data corruption, injection, wrong balance, crash…).
  Fix:  the concrete change.
  Confidence: high | medium | low (say what you're unsure about).
```

Severities: **Critical** (exploitable / data loss), **High** (security or
correctness bug on a real path), **Medium** (edge-case bug, missing
validation/bound), **Low** (convention, clarity). End with a one-line verdict:
safe to merge, or blockers remain. Don't pad the list — no real findings is a
valid, stated outcome. Flag uncertainty rather than inventing issues.

## Notes / gotchas

- The script's risk flags are **grep heuristics**: the money-math flag fires on
  the cents-refactor branch (expected — that's where `money.ts` lives), the
  SQL-interpolation flag can fire on safe column-list code. Always confirm
  against the actual diff; never report a flag verbatim as a finding.
- For a broad, multi-file automated pass, `/code-review ultra` (cloud,
  multi-agent) is the heavier hammer; this skill is the targeted manual audit.
- Want context isolation + a PR-hygiene layer? Spawn the `pr-review` agent
  (`.claude/agents/`), a read-only wrapper that runs **this** skill's core in its
  own window and adds checks for commit hygiene, test adequacy, and style. It is
  dual-mode: in PR mode (a PR number or the branch's open PR) it also checks
  description-vs-diff and returns ready-to-paste GitHub comments; with no PR it
  reviews the branch diff vs `main` + working tree. Default to running this skill
  directly when you want the findings to stay in the main context.
- The full diff can be large; if `scope.sh` output is long, review per-layer
  using the "Layers touched" list to prioritise Services → Repositories →
  Schemas first (where security/correctness bugs concentrate).
