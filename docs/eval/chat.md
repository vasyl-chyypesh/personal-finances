# AI chat — prompt evaluation

> How the AI-chat extraction prompt is measured. Conventions live in
> [`src/eval/CLAUDE.md`](../../src/eval/CLAUDE.md); the feature itself is in
> [`docs/api/ai-chat.md`](../api/ai-chat.md).

The eval grades the **real** extractor (`createLedgerExtractor`, so it always
tests the shipped prompt) against a curated golden dataset, using **hybrid
grading**: deterministic code for objective fields, a **local Ollama LLM judge**
for the subjective ones. It is a standalone dev tool — it needs a live Ollama
daemon and is **not** part of the CI gate.

## Commands

- `npm run eval:chat` — run the extraction eval. Flags: `--model=<name>`,
  `--judge-model=<name>` (else `EVAL_JUDGE_MODEL`, else the extractor model),
  `--no-judge` (deterministic-only), `--filter=<id-substr|locale>`,
  `--cases=<path>`, `--threshold=<pct>` (exit non-zero below it).
  **Every run writes a timestamped JSON artifact** (`chat-eval-<ISO-stamp>.json`),
  by default into `src/eval/chat/results/` (gitignored). `--out-dir=<dir>` changes
  the directory, `--json=<path>` overrides the exact path, `--no-json` skips it.
- `npm run eval:judge` — the **meta-eval**: validate the judge itself against
  hand-labeled cases (see below). Flags: `--judge-model`, `--filter`, `--cases`,
  `--threshold`.
- `npm run eval:report` — render the JSON artifacts in `results/` into a static
  HTML report (an `index.html` over all runs plus one page per run). No daemon
  needed. Flags: `--results-dir=<dir>` (where the artifacts are), `--cases=<path>`
  (the dataset to join messages from, default `cases.jsonl`). Output is written
  next to the artifacts; the final log line prints the `file://…/index.html` to open.

`eval:chat` / `eval:judge` read `CHAT_MODEL` / `OLLAMA_HOST` from `.env`.

## HTML report

`eval:report` is a coverage-style viewer, fully separate from the app UI. Each page
is self-contained (inlined CSS/JS and data) so it opens straight from `file://`.
The per-case **message** and rubrics are not in the artifact — they are joined from
`cases.jsonl` by case `id` at render time, so regenerate against the same dataset
the run used. A case whose `id` no longer exists in `cases.jsonl` renders with an
"input unavailable — dataset changed" note instead of its message. The report
covers the objective field grades (expected vs actual) and the judge's per-criterion
verdict + reason, with a "show only failures" toggle.

## Grading

| Field                                        | Graded by | How                                                                                                                       |
| -------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------- |
| `type`, `amount` (cents), `currency`, `date` | code      | exact match on the **normalized** draft, so a defaulted expected value only matches a defaulted actual one                |
| `category`                                   | code      | exact match on the raw slug (the schema pins the model to real slugs or `null`, so slug equality is category correctness) |
| `description`                                | LLM judge | captures the place/payee (or empty when none) and does not merely repeat the category                                     |
| `uncertainFields`                            | LLM judge | the fields the **model itself** flagged are reasonable — flag weak/ambiguous values, not clearly-stated or absent ones    |

A case passes only when every deterministic field **and** both judge criteria
pass. Both sides run through the API's exported
`normalizeExtraction(raw, categories, today)`; the eval injects a **fixed `today`
per case** so relative-date cases grade deterministically.

The judge replies under an Ollama JSON-schema `format` at temperature 0, and the
schema orders each **reason before its verdict** so the pass/fail is conditioned
on written reasoning (chain-of-thought).

## Dataset (`src/eval/chat/cases.jsonl`)

One JSON case per line, bilingual EN/UK:

```jsonc
{
  "id": "en-grocery-basic", // unique, stable
  "locale": "en", // "en" | "uk"
  "message": "spent 500 on groceries",
  "today": "2026-06-15", // reference date for relative dates
  "expected": {
    // RawExtraction minus uncertainFields; null = "not stated"
    "type": "expense", // "income" | "expense" | null
    "amountMajor": 500, // major units; null when unstated
    "currency": null, // "UAH" | "USD" | "EUR" | null
    "categorySlug": "grocery", // a real CATEGORY_CATALOG slug, or null
    "description": null,
    "date": null, // YYYY-MM-DD or null
  },
  "descriptionRubric": "...", // optional guidance for the judge
  "uncertaintyRubric": "...",
}
```

**Adding a case:** append a line with a new `id`; set `categorySlug` to a real
catalog slug (or `null`); pick a `today` and express any relative date against it.
`cases.test.ts` guards the file (parses, unique ids, real slugs) under `npm test`.

## Judge meta-eval (`src/eval/judge/judgeCases.jsonl`)

"Grading the grader." Each meta-case is a known judge input plus the verdict a
correct judge should return per criterion:

```jsonc
{
  "id": "unc-flag-clear-amount-fail",
  "input": {
    "message": "spent 500 on groceries",
    "expectedDescription": null,
    "actualDescription": null,
    "flaggedByModel": ["amount"],
    "uncertaintyRubric": "...",
  },
  "expect": { "description": "pass", "uncertainty": "fail" },
}
```

`npm run eval:judge` reports how often the judge's verdict matches the label per
criterion, so you can trust the judge before trusting its grades.

## Tests

Everything under `__tests__/` is **daemon-free** and runs in `npm test`: pure
graders, report/artifact builders, the JSONL loaders, the dataset guards, and the
judge with an injected fake `chat`. The live model runs only via the two
`eval:*` commands.
