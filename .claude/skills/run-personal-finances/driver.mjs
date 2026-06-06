#!/usr/bin/env node
// Zero-dependency browser driver for the personal-finances SPA.
//
// Drives the running UI (Vite on :5173, which proxies /api to the API on
// :3001) through the Chrome DevTools Protocol over Node's built-in WebSocket
// and fetch — no Playwright/puppeteer/chromium-cli required. macOS Google
// Chrome is launched headless; pages are driven via Runtime.evaluate (which
// is React-controlled-input safe: it uses the native value setter + dispatches
// input/change events) and captured via Page.captureScreenshot.
//
// Usage:
//   node driver.mjs shot [route] [outfile]     navigate + screenshot + console errors
//   node driver.mjs flow [outfile]             add a ledger entry via the form, screenshot
//
// Defaults: route=/list, outfile under ./.claude/skills/run-personal-finances/shots/
// Env: UI_URL (default http://localhost:5173), CHROME (path to Chrome binary)

import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const UI_URL = process.env.UI_URL ?? 'http://localhost:5173';
const CHROME =
  process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9223;
const SKILL_DIR = dirname(fileURLToPath(import.meta.url));
const SHOTS_DIR = join(SKILL_DIR, 'shots');

function resolveOut(name, fallback) {
  const p = name ?? fallback;
  return isAbsolute(p) ? p : join(SHOTS_DIR, p);
}

async function waitForJson(url, attempts = 50) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`timed out waiting for ${url}`);
}

class CDP {
  #ws;
  #id = 0;
  #pending = new Map();
  consoleErrors = [];

  static async launch() {
    const userDataDir = mkdtempSync(join(tmpdir(), 'pf-driver-'));
    const proc = spawn(
      CHROME,
      [
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        '--no-first-run',
        '--window-size=1280,900',
        `--remote-debugging-port=${PORT}`,
        `--user-data-dir=${userDataDir}`,
        'about:blank',
      ],
      { stdio: 'ignore' },
    );
    const targets = await waitForJson(`http://127.0.0.1:${PORT}/json`);
    const page = targets.find((t) => t.type === 'page');
    if (!page) throw new Error('no page target from Chrome');
    const cdp = new CDP();
    cdp.proc = proc;
    await cdp.#connect(page.webSocketDebuggerUrl);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    return cdp;
  }

  #connect(wsUrl) {
    return new Promise((resolve, reject) => {
      this.#ws = new WebSocket(wsUrl);
      this.#ws.addEventListener('open', () => resolve());
      this.#ws.addEventListener('error', (e) => reject(e.error ?? new Error('ws error')));
      this.#ws.addEventListener('message', (ev) => this.#onMessage(ev.data));
    });
  }

  #onMessage(data) {
    const msg = JSON.parse(data);
    if (msg.id != null && this.#pending.has(msg.id)) {
      const { resolve, reject } = this.#pending.get(msg.id);
      this.#pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      return;
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      this.consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      this.consoleErrors.push(msg.params.exceptionDetails.text);
    }
  }

  send(method, params = {}) {
    const id = ++this.#id;
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      this.#ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async navigate(url) {
    const loaded = new Promise((resolve) => {
      const handler = (ev) => {
        if (JSON.parse(ev.data).method === 'Page.loadEventFired') {
          this.#ws.removeEventListener('message', handler);
          resolve();
        }
      };
      this.#ws.addEventListener('message', handler);
    });
    await this.send('Page.navigate', { url });
    await loaded;
  }

  async evaluate(expression) {
    const { result, exceptionDetails } = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (exceptionDetails) throw new Error(exceptionDetails.text + ': ' + expression);
    return result.value;
  }

  async waitFor(jsCondition, { timeout = 10000, label = jsCondition } = {}) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await this.evaluate(`!!(${jsCondition})`)) return;
      await new Promise((r) => setTimeout(r, 150));
    }
    throw new Error(`waitFor timed out: ${label}`);
  }

  async screenshot(outPath) {
    mkdirSync(dirname(outPath), { recursive: true });
    const { data } = await this.send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(outPath, Buffer.from(data, 'base64'));
    return outPath;
  }

  close() {
    try {
      this.#ws?.close();
    } catch {
      /* ignore */
    }
    this.proc?.kill();
  }
}

// React-safe field setters, injected into the page.
const HELPERS = `
  window.__set = (sel, value) => {
    const el = document.querySelector(sel);
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };
  window.__setSelect = (sel, value) => {
    const el = document.querySelector(sel);
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };
  true;
`;

function reportErrors(cdp) {
  if (cdp.consoleErrors.length) {
    console.log('Console errors:\n  ' + cdp.consoleErrors.join('\n  '));
  } else {
    console.log('Console errors: none');
  }
}

async function cmdShot(route = '/list', outName) {
  const out = resolveOut(outName, 'shot.png');
  const cdp = await CDP.launch();
  try {
    await cdp.navigate(UI_URL + route);
    await cdp.waitFor(`document.querySelector('nav')`, { label: 'app shell' });
    await new Promise((r) => setTimeout(r, 600)); // let data fetches settle
    await cdp.screenshot(out);
    console.log('Screenshot: ' + out);
    reportErrors(cdp);
  } finally {
    cdp.close();
  }
}

async function cmdFlow(outName) {
  const out = resolveOut(outName, 'flow.png');
  const cdp = await CDP.launch();
  try {
    await cdp.navigate(UI_URL + '/list');
    await cdp.waitFor(`document.querySelector('#category')`, { label: 'ledger form' });
    // Categories load async — wait until the <select> has real options.
    await cdp.waitFor(`document.querySelectorAll('#category option').length > 1`, {
      label: 'categories loaded',
    });
    await cdp.evaluate(HELPERS);
    const amount = (Math.random() * 90 + 10).toFixed(2);
    const desc = 'driver smoke ' + new Date().toISOString().slice(11, 19);
    await cdp.evaluate(`__set('#amount', '${amount}')`);
    await cdp.evaluate(`__set('#description', ${JSON.stringify(desc)})`);
    // pick the first real category option
    await cdp.evaluate(
      `__setSelect('#category', document.querySelectorAll('#category option')[1].value)`,
    );
    await cdp.evaluate(`document.querySelector('form button[type="submit"]').click()`);
    // Wait for the new entry to render in the list.
    await cdp.waitFor(`document.body.innerText.includes(${JSON.stringify(desc)})`, {
      label: 'new entry rendered',
      timeout: 8000,
    });
    await new Promise((r) => setTimeout(r, 400));
    await cdp.screenshot(out);
    console.log(`Added entry "${desc}" (${amount}); screenshot: ` + out);
    reportErrors(cdp);
  } finally {
    cdp.close();
  }
}

const [cmd, ...rest] = process.argv.slice(2);
try {
  if (cmd === 'shot') await cmdShot(rest[0], rest[1]);
  else if (cmd === 'flow') await cmdFlow(rest[0]);
  else {
    console.error('Usage: node driver.mjs <shot|flow> [args]');
    process.exit(2);
  }
} catch (err) {
  console.error('DRIVER ERROR: ' + err.message);
  process.exit(1);
}
