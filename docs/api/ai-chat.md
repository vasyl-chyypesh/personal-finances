# AI chat

> Feature internals extracted from `src/api/CLAUDE.md`. That guide holds the
> conventions; this file holds the per-feature detail. The extraction prompt's
> **quality is measured** by a separate eval pipeline — see
> [`docs/eval/chat.md`](../eval/chat.md).

The `chat` feature turns a natural-language message into a **draft** ledger entry
— it only **extracts**; saving reuses `POST /api/ledger`. There is **no table** and
no persisted history (the conversation is client-side only). It mirrors the
exchange-rates **injectable provider** pattern so tests never reach a daemon.

- **Extractor** (`chat.llm.ts`): `createLedgerExtractor()` returns an
  `ILedgerExtractor` backed by **[Ollama](https://ollama.com)** (a local daemon; no
  model code runs in this process). `extract()` calls
  `ollama.chat({ model, format, options, messages })` with `format` set to a **JSON
  schema** whose `categorySlug` is an `enum` of the live category slugs (or `null`),
  so the model can't invent a category; every other field is nullable (`null` = "not
  stated"), all `required`. Runs at low temperature. On the first `extract`, the
  model is **pulled if missing** (`ollama.pull`). `CHAT_MODEL` (default
  `gemma4:12b-mlx`) and `OLLAMA_HOST` (default `http://127.0.0.1:11434`) are read
  from env. The "tuning" is **prompt/config only** (system prompt + EN/UK few-shot +
  JSON-schema format + sampling) — there is no training pipeline.
- **Service** (`chat.service.ts`): `ChatService(extractor, categoriesRepo)`. Applies
  defaults for `null` fields (date→today, currency→`UAH`, type→`expense`) and flags
  each as uncertain; converts the major-unit amount to integer cents; resolves
  `categorySlug`→`categoryId` against non-deleted categories (never guesses — an
  unresolved slug yields `categoryId: null` + `unresolvedCategory: true`); merges the
  model's own `uncertainFields`. Throws `HttpError(CHAT_UNAVAILABLE, 503)` when the
  extractor is unavailable. `status()` is async: it returns `{ available, ready }`
  and only probes the daemon (`isReady()`) when `available`.
- **Endpoints**: `POST /api/chat/extract` `{ message }` →
  `{ draft, uncertainFields, unresolvedCategory }` (the `draft` mirrors
  `CreateLedgerEntryDto`, except `categoryId` may be `null`). `GET /api/chat/status`
  → `{ available, ready }` (`available` = a model is configured; `ready` = the daemon
  already has it — an unreachable daemon yields `ready:false`). `chat.schema.ts`
  validates the request.
- **Optional / offline**: an empty `CHAT_MODEL` disables the feature
  (`available:false`; the UI shows a "not configured" notice). The HTTP integration
  test sets `CHAT_MODEL=''` so the route is exercised **without a daemon** — the same
  idea as `RATES_OFFLINE`. The extractor is injected as a fake in the service unit
  tests, so **no daemon is ever contacted in tests/CI**.
