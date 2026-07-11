# src/eval/CLAUDE.md

Guidance for the evaluation tooling under `src/eval/`. See the root `CLAUDE.md`
for project-wide rules (env, naming, hard constraints, tooling, commands).

A standalone dev tool (parallel to `src/api/`, `src/ui/`, `src/cli/`, **not** an
HTTP feature) that measures the quality of the AI-chat extraction prompt against a
curated golden dataset. Like the xls importer it runs on demand from the CLI and
reuses the API's modules; unlike a feature it is **not shipped** —
`tsconfig.build.json` excludes `./src/eval`, so `npm run build` never emits it.

- **Run**: `npm run eval:chat` — needs a live Ollama daemon (it exercises the
  **real** extractor, `createLedgerExtractor`, so the eval always tests the prompt
  the product actually ships). Honors `CHAT_MODEL` / `OLLAMA_HOST` from `.env`.
  Flags: `--model=<name>` (override the extractor model), `--filter=<id-substr|locale>`,
  `--cases=<path>`, `--threshold=<pct>` (exit non-zero below it — for an opt-in job;
  it is **not** in the default CI gate).

## Design (hybrid grading)

Objective fields are graded deterministically in code; subjective fields are left
to a local LLM judge (phase 4, not yet built). The extractor and the judge are
both local Ollama models — no external API, consistent with the app's local-first
stance.

- **Deterministic (`fieldGrader.ts`)** — exact-match on `type`, `amount` (integer
  cents), `currency`, `category` (raw slug), `date`. `type`/`amount`/`currency`/`date`
  are compared on the **normalized draft**, so a defaulted expected value only
  matches a defaulted actual one. `category` compares the raw slug (the schema
  constrains the model to real slugs or `null`, so slug equality _is_ category
  correctness).
- **LLM-judged (planned)** — `description` quality and `uncertainFields`
  appropriateness. Excluded from the deterministic grader on purpose.

Both sides run through the API's exported `normalizeExtraction(raw, categories, today)`
(single source of truth with `ChatService`). The eval injects a **fixed `today`
per case** so relative-date cases ("yesterday"/"вчора") grade deterministically —
this is why `normalizeExtraction` takes `today` as an argument rather than reading
the clock.

## Files (`src/eval/chat/`)

- `eval.types.ts` — `EvalCase`, `ExpectedExtraction`, `FieldGrade`, `CaseResult`,
  `RunReport`.
- `cases.jsonl` — the golden dataset: one JSON case per line, bilingual EN/UK.
  Each case is `{ id, locale, message, today, expected, descriptionRubric?,
uncertaintyRubric? }`; `expected` mirrors the model's `RawExtraction` minus
  `uncertainFields`, with `null` = "not stated". `categorySlug` must be a real
  `CATEGORY_CATALOG` slug. Ids are unique and stable.
- `loadCases.ts` — pure `parseCases(text)` (Zod-validated; throws with the line
  number on bad JSON / schema / duplicate id) + `loadCases(path)` file wrapper.
- `fieldGrader.ts` — pure `gradeFields(expected, actual)` → `FieldGrade[]`.
- `report.ts` — pure `buildReport(results)` (overall / per-locale / per-field
  tallies) + `formatReport(report, meta)` (one multi-line string for the logger).
- `evalChat.ts` — entry: arg parsing, builds synthetic categories from the
  catalog, runs the real extractor per case, grades, and logs the report; exits
  non-zero below `--threshold`.

## Conventions

- **No `console.*`** — use the shared `Logger` (`src/api/shared/logger.ts`), same
  as the CLI. The report is built as one string and logged once.
- **Reuse, don't fork** — grading normalization comes from `normalizeExtraction`;
  categories come from `CATEGORY_CATALOG`. Do not duplicate money/date/slug logic.

## Tests (`src/eval/chat/__tests__/`)

Unit tests only, and **daemon-free** — they run under the project-wide `npm test`
glob, so they must never contact Ollama. `fieldGrader.test.ts`, `report.test.ts`,
and `loadCases.test.ts` use inline fixtures. The live model run happens only via
`npm run eval:chat`. (The LLM judge, when added, will be unit-tested with a fake
Ollama client, mirroring `fakeExtractor` in `src/api/chat/__tests__/chat.test.ts`.)
