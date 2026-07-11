import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildReport, formatReport } from '../report.js';
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
