---
name: run-personal-finances
description: Run, launch, build, test, or screenshot the personal-finances app — the Express API (:3001) + React/Vite SPA (:5173). Use to start both dev servers, drive the UI headlessly, add a ledger entry through the form, capture a screenshot, or confirm a change works end-to-end.
---

# Run personal-finances

A local personal-finance manager: an Express 5 + TypeScript API on `:3001`
backed by SQLite, and a React 19 + Vite SPA on `:5173` that proxies `/api`
to the API. **Both dev servers must run together.**

The agent path drives the running SPA through Chrome's DevTools Protocol
using **`.claude/skills/run-personal-finances/driver.mjs`** — a
zero-dependency Node script (built-in `WebSocket` + `fetch`, no
Playwright/puppeteer/chromium-cli). It launches macOS Google Chrome
headless, fills/clicks React-controlled inputs safely, and writes PNG
screenshots.

All paths below are relative to the repo root (`<unit>/`). Verified on
macOS, Node v25.9.0, Google Chrome installed at the default `/Applications`
path.

## Prerequisites

- Node ≥ 25 (`node --version` → `v25.9.0` here) and npm.
- Google Chrome at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
  (override with the `CHROME` env var). The driver uses CDP port `9223`.
- No `apt-get` — this is macOS. macOS has **no `timeout`**; the poll loops
  below use `for i in $(seq ...)` instead.

```bash
npm install
```

## Build

Not required for the dev/agent path (both servers run from source via
`tsx`/Vite). Production build, if you need it:

```bash
npm run build      # API → dist/
npm run build:ui   # SPA → dist/ui
```

## Run (agent path)

### 1. Start both servers

Start the API against a **scratch DB** so the driver's writes never touch
the real `finance.db` (the SPA's "Add entry" flow persists through the
API). Then start the UI:

```bash
DB_PATH=/tmp/pf-driver.db npm run dev:api &> /tmp/pf-api.log &
npm run dev:ui &> /tmp/pf-ui.log &
```

Wait for both to come up (poll — don't `sleep`):

```bash
for i in $(seq 1 30); do curl -sf http://localhost:3001/health >/dev/null && break; sleep 1; done
for i in $(seq 1 30); do curl -sf http://localhost:5173/ >/dev/null && break; sleep 1; done
curl -s http://localhost:3001/health
# → {"status":"ok","timestamp":"..."}
```

### 2. Drive the UI

Screenshot any route (`/list`, `/table`, `/categories`):

```bash
node .claude/skills/run-personal-finances/driver.mjs shot /list list.png
# → Screenshot: .../shots/list.png
# → Console errors: none
```

Run a real interaction — fills the "Add entry" form (amount, description,
first category), submits, waits for the new row to render, screenshots:

```bash
node .claude/skills/run-personal-finances/driver.mjs flow flow.png
# → Added entry "driver smoke HH:MM:SS" (NN.NN); screenshot: .../shots/flow.png
# → Console errors: none
```

Screenshots land in `.claude/skills/run-personal-finances/shots/`
(gitignored). **Open the PNG and look at it** — `flow.png` should show the
new entry in the list table (e.g. `Charity … driver smoke … −13.71 UAH`).
`Console errors: none` must hold; a shell can render while every fetch 500s.

### 3. Stop

```bash
pkill -f 'tsx watch src/api/index.ts'   # API
pkill -f 'vite'                          # UI
```

## Run (human path)

Two terminals, the real DB, and a browser window — useless headless:

```bash
npm run dev:api   # terminal 1, :3001
npm run dev:ui    # terminal 2, :5173 → open http://localhost:5173
```

## Direct API smoke (no browser)

The Vite proxy means you can hit the API directly. Useful when a change is
API-only:

```bash
curl -s http://localhost:3001/api/categories | head -c 120
curl -s "http://localhost:3001/api/ledger?period=month&year=2026&month=6"
# → {"records":[...],"period":"month","startDate":...,"total":N}
```

Note: zsh globs a bare `?` — quote URLs with query strings.

## Test

```bash
npm test          # native node:test + supertest, ~0.5s, 116 tests
```

## Gotchas

- **`flow` persists to the API's DB.** The form submit is a real
  `POST /api/ledger`. Always launch the API with `DB_PATH=/tmp/pf-driver.db`
  (above) for driver runs, or the smoke entry lands in `finance.db`. To
  remove a stray one: find it via
  `GET /api/ledger?period=month&year=YYYY&month=M` (response is
  `{records:[...]}`) and `DELETE /api/ledger/:id` (→ `204`).
- **macOS has no `timeout`.** The `examples/server.md` pattern uses it;
  here use `for i in $(seq 1 N); do curl -sf URL && break; sleep 1; done`.
- **Chrome stderr noise.** Headless Chrome prints
  `task_policy_set TASK_CATEGORY_POLICY: (os/kern) invalid argument` on
  macOS. Harmless — the screenshot still writes. The driver runs Chrome
  with `stdio: 'ignore'` so you won't normally see it.
- **React controlled inputs.** Setting `el.value` directly does not fire
  React's onChange. The driver injects the native value setter and
  dispatches `input`/`change` (`window.__set`/`__setSelect`) — copy that
  approach if you extend it.
- **Categories load async.** The `#category` `<select>` starts with just
  the placeholder; the driver waits for `option.length > 1` before
  selecting, so the form doesn't submit with an empty category.
- **Backgrounding `npm run`.** `&` backgrounds the npm wrapper, which
  spawns the real process; stop with `pkill -f` on the underlying command
  (`tsx watch …` / `vite`), not by killing npm.
- **CDP port 9223** is separate from the app ports. If a previous driver
  run left Chrome alive (`pkill -f 'remote-debugging-port=9223'`), the next
  launch reuses/fights it — kill it first.

## Troubleshooting

- **`DRIVER ERROR: timed out waiting for http://127.0.0.1:9223/json`** —
  Chrome didn't start. Check the `CHROME` path exists; override via
  `CHROME=/path/to/chrome node .../driver.mjs shot`.
- **`waitFor timed out: categories loaded`** — the API isn't reachable
  through the Vite proxy. Confirm `curl -s http://localhost:5173/api/categories`
  returns JSON (both servers up, API not crashed — check `/tmp/pf-api.log`).
- **`waitFor timed out: new entry rendered`** — the POST failed. Run the
  Direct API smoke above and check `/tmp/pf-api.log`; rate limiting is
  60 req/min per IP.
- **Blank/shell-only screenshot** — first Vite paint can be slow; re-run
  `shot` (Vite compiles routes on demand, the second hit is warm).
