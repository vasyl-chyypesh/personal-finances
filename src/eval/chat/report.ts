import path from 'node:path';
import type {
  CaseResult,
  FieldGrade,
  FieldTally,
  GradedField,
  JudgeVerdict,
  RunReport,
} from './eval.types.js';

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
  const byJudge = { description: emptyTally(), uncertainty: emptyTally() };
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
      if (r.judge) {
        byJudge.description.total += 1;
        if (r.judge.description.pass) byJudge.description.passed += 1;
        byJudge.uncertainty.total += 1;
        if (r.judge.uncertainty.pass) byJudge.uncertainty.passed += 1;
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
    byJudge,
    failures,
    errored,
  };
}

export interface JsonCaseResult {
  id: string;
  locale: string;
  pass: boolean;
  error?: string;
  fields: FieldGrade[];
  judge?: JudgeVerdict;
}

/** A machine-readable run artifact (`--json`), diffable across runs. */
export interface JsonArtifact {
  generatedAt: string;
  model: string;
  judgeModel?: string;
  summary: {
    total: number;
    passed: number;
    passRate: number;
    byField: Record<GradedField, FieldTally>;
    byJudge: { description: FieldTally; uncertainty: FieldTally };
    byLocale: Record<string, FieldTally>;
  };
  cases: JsonCaseResult[];
}

/** Build the serializable artifact from the per-case results and the aggregate. */
export function buildJsonArtifact(
  results: CaseResult[],
  report: RunReport,
  meta: { model: string; judgeModel?: string; generatedAt: string },
): JsonArtifact {
  return {
    generatedAt: meta.generatedAt,
    model: meta.model,
    ...(meta.judgeModel ? { judgeModel: meta.judgeModel } : {}),
    summary: {
      total: report.total,
      passed: report.passed,
      passRate: report.passRate,
      byField: report.byField,
      byJudge: report.byJudge,
      byLocale: report.byLocale,
    },
    cases: results.map((r) => ({
      id: r.case.id,
      locale: r.case.locale,
      pass: r.pass,
      ...(r.error ? { error: r.error } : {}),
      fields: r.fields,
      ...(r.judge ? { judge: r.judge } : {}),
    })),
  };
}

/** Colon-safe, lexicographically sortable filename, e.g. `chat-eval-2026-07-12T07-43-20.json`. */
export function artifactFilename(prefix: string, now: Date): string {
  const stamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
  return `${prefix}-${stamp}.json`;
}

/**
 * Resolve where to write the results artifact from the CLI options. Precedence:
 * `--no-json` disables it (returns `null`); else an explicit `--json` path wins;
 * else a timestamped file in `--out-dir` or the default results directory.
 */
export function resolveArtifactPath(
  opts: { jsonPath?: string; outDir?: string; noJson?: boolean },
  defaults: { dir: string; prefix: string; now: Date },
): string | null {
  if (opts.noJson) return null;
  if (opts.jsonPath) return opts.jsonPath;
  return path.join(opts.outDir ?? defaults.dir, artifactFilename(defaults.prefix, defaults.now));
}

/** The first failing field or judge criterion of a case, for a compact line. */
function firstFailure(r: CaseResult): string {
  const g = r.fields.find((f) => !f.pass);
  if (g) return `${g.field}: expected ${g.expected}, got ${g.actual}`;
  if (r.judge && !r.judge.description.pass) return `description: ${r.judge.description.reason}`;
  if (r.judge && !r.judge.uncertainty.pass) return `uncertainty: ${r.judge.uncertainty.reason}`;
  return '';
}

/** Render a run report as a single multi-line string for the logger. */
export function formatReport(
  report: RunReport,
  meta: { model: string; judgeModel?: string },
): string {
  const lines: string[] = [];
  const judgeTag = meta.judgeModel ? `  judge=${meta.judgeModel}` : '';
  lines.push(`Chat extraction eval — model=${meta.model}${judgeTag}  (${report.total} cases)`);

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

  const { description: desc, uncertainty: unc } = report.byJudge;
  if (desc.total > 0) {
    lines.push(
      `LLM-judged:          description ${pct(desc.passed, desc.total)}  ` +
        `uncertainty ${pct(unc.passed, unc.total)}`,
    );
  }

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
