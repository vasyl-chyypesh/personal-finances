import type { EvalCase, FieldGrade, JudgeCriterion } from './eval.types.js';
import type { JsonArtifact, JsonCaseResult } from './report.js';

/** One run plus the filename its HTML page is written to (for index links). */
export interface RunLink {
  artifact: JsonArtifact;
  href: string;
}

/** A passed/total pair — the shape of every summary tally. */
interface Tally {
  passed: number;
  total: number;
}

/** Escape a string for safe interpolation into HTML text or a double-quoted attribute. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function pct(passed: number, total: number): string {
  return total === 0 ? '—' : `${((passed / total) * 100).toFixed(1)}%`;
}

/** Coarse bucket used to colour a ratio bar. */
function ratioClass(passed: number, total: number): string {
  if (total === 0) return 'none';
  const p = (passed / total) * 100;
  return p >= 100 ? 'full' : p >= 80 ? 'high' : p >= 50 ? 'mid' : 'low';
}

/** A labelled proportion bar (`passed/total · pct`). */
function bar(passed: number, total: number): string {
  const width = total === 0 ? 0 : (passed / total) * 100;
  return (
    `<div class="bar"><div class="fill ${ratioClass(passed, total)}" ` +
    `style="width:${width.toFixed(1)}%"></div>` +
    `<span class="bar-label">${passed}/${total} · ${pct(passed, total)}</span></div>`
  );
}

/** "2026-07-13T12:32:59.360Z" -> "2026-07-13 12:32:59 UTC" (falls back to the raw value). */
function fmtDate(iso: string): string {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})/.exec(iso);
  return m ? `${m[1]} ${m[2]} UTC` : iso;
}

const STYLE = `
* { box-sizing: border-box; }
body { font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  margin: 0 auto; padding: 2rem; max-width: 1000px; color: #1a1a1a; background: #fff; }
a { color: #2563eb; text-decoration: none; }
a:hover { text-decoration: underline; }
h1 { font-size: 1.5rem; margin: 0 0 .25rem; }
.meta { color: #666; margin: .25rem 0 1rem; font-size: .9rem; }
.badge { display: inline-block; padding: .1rem .5rem; border-radius: 999px; font-size: .78rem;
  font-weight: 600; background: #e5e7eb; color: #374151; }
.badge.pass { background: #dcfce7; color: #166534; }
.badge.fail { background: #fee2e2; color: #991b1b; }
.badge.error { background: #ffedd5; color: #9a3412; }
.bar { position: relative; background: #eee; border-radius: 4px; height: 20px; overflow: hidden; }
.bar .fill { height: 100%; }
.fill.full { background: #22c55e; } .fill.high { background: #84cc16; }
.fill.mid { background: #eab308; } .fill.low { background: #ef4444; } .fill.none { background: #9ca3af; }
.bar-label { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  font-size: .75rem; font-weight: 600; color: #111; }
.stats { display: grid; grid-template-columns: max-content 1fr; gap: .4rem 1rem; align-items: center;
  margin: 1rem 0 2rem; }
.stats .k { color: #555; }
.stats .grp { grid-column: 1 / -1; font-weight: 600; margin-top: .6rem; }
table { border-collapse: collapse; width: 100%; }
th, td { text-align: left; padding: .4rem .6rem; border-bottom: 1px solid #eee; }
th { font-size: .8rem; text-transform: uppercase; letter-spacing: .03em; color: #666; }
details.case { border: 1px solid #eee; border-radius: 6px; margin: .4rem 0; padding: 0 .8rem; }
details.case[open] { padding-bottom: .8rem; }
details.case > summary { cursor: pointer; padding: .6rem 0; display: flex; gap: .6rem; align-items: center; }
.cid { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .85rem; }
.msg { background: #f7f7f8; border-radius: 6px; padding: .5rem .7rem; margin: .4rem 0; }
.fld { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .82rem; }
tr.miss td { background: #fef2f2; }
.reason { color: #444; font-size: .9rem; }
.toolbar { margin: 1rem 0; }
body.hide-pass details.case.pass { display: none; }
@media (prefers-color-scheme: dark) {
  body { background: #0f1115; color: #e6e6e6; }
  .meta, .stats .k, th { color: #9aa0aa; }
  a { color: #60a5fa; }
  .badge { background: #262a31; color: #cbd5e1; }
  .badge.pass { background: #14532d; color: #bbf7d0; }
  .badge.fail { background: #7f1d1d; color: #fecaca; }
  .badge.error { background: #7c2d12; color: #fed7aa; }
  .bar { background: #262a31; } .bar-label { color: #fff; }
  th, td { border-color: #262a31; }
  details.case { border-color: #262a31; }
  .msg { background: #1a1d23; }
  .reason { color: #b6bcc6; }
  tr.miss td { background: #2a1618; }
}
`;

/** Wrap page body in a self-contained HTML document (inline CSS, optional inline JS). */
function page(title: string, body: string, script = ''): string {
  return (
    `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">\n` +
    `<title>${escapeHtml(title)}</title>\n<style>${STYLE}</style>\n</head>\n<body>\n` +
    `${body}\n${script}</body>\n</html>\n`
  );
}

/** One `label → bar` pair for the stats grid. */
function statRow(label: string, t: Tally): string {
  return `<div class="k">${escapeHtml(label)}</div>${bar(t.passed, t.total)}`;
}

function localeTally(byLocale: Record<string, Tally>, loc: string): Tally {
  // eslint-disable-next-line security/detect-object-injection -- loc is a fixed 'en' | 'uk' literal from the caller
  return byLocale[loc] ?? { passed: 0, total: 0 };
}

/** The landing page: every run, newest-first, linking to each run's page. */
export function buildIndexHtml(runs: RunLink[]): string {
  const sorted = [...runs].sort((a, b) =>
    b.artifact.generatedAt.localeCompare(a.artifact.generatedAt),
  );

  const rows = sorted
    .map(({ artifact: a, href }) => {
      const s = a.summary;
      const en = localeTally(s.byLocale, 'en');
      const uk = localeTally(s.byLocale, 'uk');
      return (
        `<tr><td><a href="${escapeHtml(href)}">${escapeHtml(fmtDate(a.generatedAt))}</a></td>` +
        `<td class="fld">${escapeHtml(a.model)}</td>` +
        `<td class="fld">${a.judgeModel ? escapeHtml(a.judgeModel) : '—'}</td>` +
        `<td>${bar(s.passed, s.total)}</td>` +
        `<td>${en.passed}/${en.total}</td>` +
        `<td>${uk.passed}/${uk.total}</td></tr>`
      );
    })
    .join('\n');

  const body =
    `<h1>Chat eval reports</h1>\n` +
    `<p class="meta">${sorted.length} run(s), newest first.</p>\n` +
    (sorted.length === 0
      ? `<p>No runs found.</p>`
      : `<table>\n<thead><tr><th>Run</th><th>Model</th><th>Judge</th>` +
        `<th>Overall</th><th>EN</th><th>UK</th></tr></thead>\n<tbody>\n${rows}\n</tbody>\n</table>`);

  return page('Chat eval reports', body);
}

/** One judged criterion line: a pass/fail badge plus the judge's reason. */
function renderJudge(name: string, c: JudgeCriterion): string {
  return (
    `<p><span class="badge ${c.pass ? 'pass' : 'fail'}">${name} ${c.pass ? 'pass' : 'fail'}</span> ` +
    `<span class="reason">${escapeHtml(c.reason)}</span></p>`
  );
}

/** One field row (expected vs actual), highlighted when it did not match. */
function renderFieldRow(f: FieldGrade): string {
  return (
    `<tr class="${f.pass ? '' : 'miss'}"><td class="fld">${escapeHtml(f.field)}</td>` +
    `<td class="fld">${escapeHtml(f.expected)}</td>` +
    `<td class="fld">${escapeHtml(f.actual)}</td>` +
    `<td>${f.pass ? '✓' : '✗'}</td></tr>`
  );
}

/** One collapsible case: status, the joined message, field grades, and judge reasons. */
function renderCase(c: JsonCaseResult, input: EvalCase | undefined): string {
  const status = c.error ? 'error' : c.pass ? 'pass' : 'fail';
  const summary =
    `<summary><span class="cid">${escapeHtml(c.id)}</span>` +
    `<span class="badge">${escapeHtml(c.locale)}</span>` +
    `<span class="badge ${status}">${status.toUpperCase()}</span></summary>`;

  const message = input
    ? `<div class="msg">${escapeHtml(input.message)}</div>`
    : `<div class="msg">(input unavailable — dataset changed)</div>`;

  let detail = message;
  if (c.error) {
    detail += `<p class="reason">Error: ${escapeHtml(c.error)}</p>`;
  } else {
    if (c.fields.length > 0) {
      const rows = c.fields.map(renderFieldRow).join('\n');
      detail +=
        `<table><thead><tr><th>Field</th><th>Expected</th><th>Actual</th><th></th></tr></thead>` +
        `<tbody>${rows}</tbody></table>`;
    }
    if (c.judge) {
      detail += renderJudge('description', c.judge.description);
      detail += renderJudge('uncertainty', c.judge.uncertainty);
    }
  }

  return `<details class="case ${status}">${summary}${detail}</details>`;
}

/** One run's page: summary bars plus a per-case drill-down (message joined from the dataset). */
export function buildRunHtml(artifact: JsonArtifact, casesById: Map<string, EvalCase>): string {
  const s = artifact.summary;

  const fieldRows = Object.entries(s.byField)
    .map(([f, t]) => statRow(f, t))
    .join('\n');
  const localeRows = Object.entries(s.byLocale)
    .map(([loc, t]) => statRow(loc.toUpperCase(), t))
    .join('\n');
  const judged = s.byJudge.description.total > 0;

  const stats = [
    statRow('Overall', { passed: s.passed, total: s.total }),
    '<div class="grp">Fields</div>',
    fieldRows,
    ...(judged
      ? [
          '<div class="grp">Judge</div>',
          statRow('description', s.byJudge.description),
          statRow('uncertainty', s.byJudge.uncertainty),
        ]
      : []),
    '<div class="grp">Locale</div>',
    localeRows,
  ].join('\n');

  const cases = artifact.cases.map((c) => renderCase(c, casesById.get(c.id))).join('\n');
  const judgeMeta = artifact.judgeModel ? ` · judge ${escapeHtml(artifact.judgeModel)}` : '';

  const body =
    `<p class="meta"><a href="index.html">← all runs</a></p>\n` +
    `<h1>${escapeHtml(artifact.model)}${judgeMeta}</h1>\n` +
    `<p class="meta">${escapeHtml(fmtDate(artifact.generatedAt))} · ` +
    `${s.passed}/${s.total} passed (${pct(s.passed, s.total)})</p>\n` +
    `<div class="stats">\n${stats}\n</div>\n` +
    `<div class="toolbar"><label><input type="checkbox" id="only-fail"> ` +
    `Show only failures</label></div>\n${cases}\n`;

  const script =
    `<script>\ndocument.getElementById('only-fail').addEventListener('change', function (e) {` +
    ` document.body.classList.toggle('hide-pass', e.target.checked); });\n</script>\n`;

  return page(`Chat eval — ${artifact.model}`, body, script);
}
