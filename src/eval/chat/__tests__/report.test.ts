import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  artifactFilename,
  buildJsonArtifact,
  buildReport,
  formatReport,
  resolveArtifactPath,
} from '../report.js';
import type { CaseResult, EvalCase, FieldGrade, GradedField } from '../eval.types.js';

function evalCase(id: string, locale: 'en' | 'uk'): EvalCase {
  return {
    id,
    locale,
    message: 'x',
    today: '2026-06-15',
    expected: {
      type: 'expense',
      amountMajor: 1,
      currency: 'UAH',
      categorySlug: 'grocery',
      description: null,
      date: null,
    },
  };
}

function grades(overrides: Partial<Record<GradedField, boolean>> = {}): FieldGrade[] {
  const fields: GradedField[] = ['type', 'amount', 'currency', 'category', 'date'];
  return fields.map((field) => ({
    field,
    // eslint-disable-next-line security/detect-object-injection -- field is a typed GradedField literal
    pass: overrides[field] ?? true,
    expected: 'x',
    actual: 'x',
  }));
}

describe('buildReport', () => {
  it('tallies overall, per-locale and per-field pass rates', () => {
    const results: CaseResult[] = [
      { case: evalCase('en-1', 'en'), fields: grades(), pass: true },
      { case: evalCase('en-2', 'en'), fields: grades({ category: false }), pass: false },
      { case: evalCase('uk-1', 'uk'), fields: grades(), pass: true },
    ];
    const report = buildReport(results);

    assert.equal(report.total, 3);
    assert.equal(report.passed, 2);
    assert.equal(report.passRate, 2 / 3);
    assert.deepEqual(report.byLocale['en'], { total: 2, passed: 1 });
    assert.deepEqual(report.byLocale['uk'], { total: 1, passed: 1 });
    // Category failed once across three graded cases.
    assert.deepEqual(report.byField.category, { total: 3, passed: 2 });
    assert.deepEqual(report.byField.type, { total: 3, passed: 3 });
    assert.equal(report.failures.length, 1);
    assert.equal(report.failures[0].case.id, 'en-2');
  });

  it('separates errored cases and excludes them from field tallies', () => {
    const results: CaseResult[] = [
      { case: evalCase('en-1', 'en'), fields: grades(), pass: true },
      { case: evalCase('en-2', 'en'), fields: [], pass: false, error: 'daemon down' },
    ];
    const report = buildReport(results);

    assert.equal(report.errored.length, 1);
    assert.equal(report.failures.length, 0);
    // Only the one non-errored case contributes to per-field totals.
    assert.equal(report.byField.type.total, 1);
    assert.equal(report.passed, 1);
  });
});

describe('formatReport', () => {
  it('renders the model, pass rate, a failing field and an error line', () => {
    const results: CaseResult[] = [
      { case: evalCase('en-ok', 'en'), fields: grades(), pass: true },
      { case: evalCase('en-bad', 'en'), fields: grades({ date: false }), pass: false },
      { case: evalCase('uk-err', 'uk'), fields: [], pass: false, error: 'boom' },
    ];
    const text = formatReport(buildReport(results), { model: 'gemma4:12b-mlx' });

    assert.match(text, /gemma4:12b-mlx/);
    assert.match(text, /Overall: 1\/3/);
    assert.match(text, /en-bad/);
    assert.match(text, /date: expected/);
    assert.match(text, /uk-err\s+boom/);
  });
});

describe('buildJsonArtifact', () => {
  it('serializes meta, summary and per-case results', () => {
    const results: CaseResult[] = [
      {
        case: evalCase('en-ok', 'en'),
        fields: grades(),
        judge: {
          description: { pass: true, reason: 'ok' },
          uncertainty: { pass: true, reason: 'ok' },
        },
        pass: true,
      },
      { case: evalCase('uk-err', 'uk'), fields: [], pass: false, error: 'boom' },
    ];
    const report = buildReport(results);
    const artifact = buildJsonArtifact(results, report, {
      model: 'ext',
      judgeModel: 'judge',
      generatedAt: '2026-07-11T00:00:00.000Z',
    });

    assert.equal(artifact.model, 'ext');
    assert.equal(artifact.judgeModel, 'judge');
    assert.equal(artifact.summary.total, 2);
    assert.equal(artifact.summary.passed, 1);
    assert.equal(artifact.cases.length, 2);
    assert.equal(artifact.cases[0].id, 'en-ok');
    assert.equal(artifact.cases[0].judge?.description.pass, true);
    assert.equal(artifact.cases[1].error, 'boom');
    // Round-trips through JSON unchanged.
    assert.deepEqual(JSON.parse(JSON.stringify(artifact)), artifact);
  });

  it('omits judgeModel when the run was deterministic-only', () => {
    const results: CaseResult[] = [{ case: evalCase('en-ok', 'en'), fields: grades(), pass: true }];
    const artifact = buildJsonArtifact(results, buildReport(results), {
      model: 'ext',
      generatedAt: '2026-07-11T00:00:00.000Z',
    });
    assert.equal('judgeModel' in artifact, false);
    assert.equal('judge' in artifact.cases[0], false);
  });
});

describe('artifactFilename', () => {
  it('builds a colon-free, sortable name from the timestamp', () => {
    const name = artifactFilename('chat-eval', new Date('2026-07-12T07:43:20.123Z'));
    assert.equal(name, 'chat-eval-2026-07-12T07-43-20.json');
    assert.doesNotMatch(name, /:/);
  });
});

describe('resolveArtifactPath', () => {
  const defaults = {
    dir: '/repo/results',
    prefix: 'chat-eval',
    now: new Date('2026-07-12T07:43:20Z'),
  };

  it('defaults to a timestamped file in the results dir', () => {
    const p = resolveArtifactPath({}, defaults);
    assert.equal(p, '/repo/results/chat-eval-2026-07-12T07-43-20.json');
  });

  it('honors --out-dir but keeps the timestamped name', () => {
    const p = resolveArtifactPath({ outDir: '/tmp/out' }, defaults);
    assert.equal(p, '/tmp/out/chat-eval-2026-07-12T07-43-20.json');
  });

  it('uses an explicit --json path verbatim (over --out-dir)', () => {
    const p = resolveArtifactPath({ jsonPath: '/x/run.json', outDir: '/tmp/out' }, defaults);
    assert.equal(p, '/x/run.json');
  });

  it('returns null when --no-json is set (over everything)', () => {
    assert.equal(resolveArtifactPath({ noJson: true, jsonPath: '/x/run.json' }, defaults), null);
  });
});
