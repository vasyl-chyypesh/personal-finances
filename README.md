# personal-finances

A personal finance manager that runs locally and stores data in a SQLite database. The backend is a TypeScript REST API built with Express 5; the frontend is a React single-page app built with Vite and Tailwind CSS.

## Tech stack

- **Runtime**: Node.js ≥ 25 (ESM only)
- **API**: Express 5 + TypeScript
- **UI**: React 19 + Vite + Tailwind CSS v4
- **Database**: SQLite via `better-sqlite3`
- **Validation**: Zod
- **Excel import**: SheetJS (`xlsx`)
- **Security**: Helmet, `express-rate-limit`
- **Tests**: native `node:test` + `supertest`

## Prerequisites

- Node.js ≥ 25
- npm
- Docker (optional — only for the Bearer security scan)

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Create your local env file
cp .env.example .env

# 3. Start the API in watch mode
npm run dev:api

# 4. In a second terminal, start the UI dev server
npm run dev:ui
```

The API listens on `http://localhost:3001` by default. The SQLite file is created automatically on first run and seeded with a set of predefined categories.

The UI is served by Vite on `http://localhost:5173` and proxies `/api/*` requests to the API on `:3001`, so both dev servers must be running to use the app. From there you can add ledger entries, list them by period (week/month/year), and edit or delete existing entries.

The app is **multi-language** (English and Ukrainian). Use the language switcher in the header to change locale; the choice is remembered in `localStorage` and defaults from the browser language. Category names are bilingual — stored per category and shown in the active language (falling back to the other language, then the slug).

## AI chat (optional)

The **AI Chat** view turns a natural-language message ("spent 500 on groceries today" / "500 грн таксі вчора", English or Ukrainian) into a **draft ledger entry** you review and confirm before it's saved. Nothing is auto-inserted; the conversation is kept in memory only (a reload clears it — the entries you confirm persist as normal).

It runs a **local LLM in-process** via [`node-llama-cpp`](https://node-llama-cpp.withcat.ai/) — no cloud, no API key. The default model is **Gemma 4 E4B-it** (`Q4_K_M` GGUF), downloaded from Hugging Face **on first chat use** into a gitignored `./models` directory (set `CHAT_MODEL_URI` in `.env`). The first message is therefore slow while the model downloads (needs network once); afterwards it runs fully offline.

The feature is **optional**: if `CHAT_MODEL_URI` is empty, the chat view shows an "AI chat is not configured" notice and the rest of the app is unaffected. Tests and CI inject a fake extractor and never download or load a model.

> **Note:** Gemma 4 is a newer architecture. If the model fails to load, your `node-llama-cpp` build's bundled `llama.cpp` may not support it yet — bump `node-llama-cpp`, or point `CHAT_MODEL_URI` at a known-good small instruct GGUF (e.g. `hf:bartowski/Qwen2.5-3B-Instruct-GGUF:Q4_K_M`). You can sanity-check a model from the CLI: `npx --no node-llama-cpp chat --prompt 'Hi' hf:unsloth/gemma-4-E4B-it-GGUF:Q4_K_M`.

The API follows a strict layered architecture: **Routes → Services → Repositories**. The UI lives under `src/ui/` (Vite SPA, plain `fetch` + hooks, no extra state library). See [CLAUDE.md](./CLAUDE.md) for the full architecture and contribution conventions.

## License

See [LICENSE](./LICENSE).
