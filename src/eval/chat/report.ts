import type { CaseResult, FieldTally, GradedField, RunReport } from './eval.types.js';

const GRADED_FIELDS: GradedField[] = ['type', 'amount', 'currency', 'category', 'date'];

function emptyTally(): FieldTally {
  return { total: 0, passed: 0 };
}

function pct(passed: number, total: number): string {
  if (total === 0) return '—';
  return `${((passed / total) * 100).toFixed(1)}%`;
}

/** Aggregate per-case results into overall, per-locale, and per-field tallies. */
export function buildReport(results: CaseResult[]): RunReport {
  const byLocale: Record<string, FieldTally> = {};
  const byField = Object.fromEntries(GRADED_FIELDS.map((f) => [f, emptyTally()])) as Record<
    GradedField,
    FieldTally
  >;
  const failures: CaseResult[] = [];
  const errored: CaseResult[] = [];

  let passed = 0;
  for (const r of results) {
    const loc = (byLocale[r.case.locale] ??= emptyTally());
    loc.total += 1;
    if (r.pass) {
      passed += 1;
      loc.passed += 1;
    }
    if (r.error) {
      errored.push(r);
    } else {
      if (!r.pass) failures.push(r);
      // Per-field tallies only cover cases that actually produced grades.
      for (const g of r.fields) {
        const t = byField[g.field];
        t.total += 1;
        if (g.pass) t.passed += 1;
      }
    }
  }

  const total = results.length;
  return {
    total,
    passed,
    passRate: total === 0 ? 0 : passed / total,
    byLocale,
    byField,
    failures,
    errored,
  };
}

/** The first failing field of a case, for a compact failure line. */
function firstFailure(r: CaseResult): string {
  const g = r.fields.find((f) => !f.pass);
  if (!g) return '';
  return `${g.field}: expected ${g.expected}, got ${g.actual}`;
}

/** Render a run report as a single multi-line string for the logger. */
export function formatReport(report: RunReport, meta: { model: string }): string {
  const lines: string[] = [];
  lines.push(`Chat extraction eval — model=${meta.model}  (${report.total} cases)`);

  const locSummary = Object.entries(report.byLocale)
    .map(([loc, t]) => `${loc.toUpperCase()} ${t.passed}/${t.total}`)
    .join('   ');
  lines.push(
    `Overall: ${report.passed}/${report.total} (${pct(report.passed, report.total)})` +
      (locSummary ? `     ${locSummary}` : ''),
  );

  const fieldSummary = GRADED_FIELDS.map(
    // eslint-disable-next-line security/detect-object-injection -- f is a typed GradedField literal
    (f) => `${f} ${pct(report.byField[f].passed, report.byField[f].total)}`,
  ).join('  ');
  lines.push(`Per-field accuracy:  ${fieldSummary}`);

  if (report.failures.length > 0) {
    lines.push('Failures:');
    for (const r of report.failures) {
      lines.push(`  ${r.case.id.padEnd(24)} ${firstFailure(r)}`);
    }
  }

  if (report.errored.length > 0) {
    lines.push('Errored:');
    for (const r of report.errored) {
      lines.push(`  ${r.case.id.padEnd(24)} ${r.error ?? 'unknown error'}`);
    }
  }

  return lines.join('\n');
}
