import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildIndexHtml, buildRunHtml, escapeHtml, type RunLink } from '../reportHtml.js';
import type { EvalCase, ExpectedExtraction } from '../eval.types.js';
import type { JsonArtifact } from '../report.js';

const EMPTY_EXPECTED: ExpectedExtraction = {
  type: null,
  amountMajor: null,
  currency: null,
  categorySlug: null,
  description: null,
  date: null,
};

function artifact(over: Partial<JsonArtifact> = {}): JsonArtifact {
  return {
    generatedAt: '2026-07-13T12:32:59.360Z',
    model: 'gemma4:e4b-mlx',
    judgeModel: 'gemma4:e4b-mlx',
    summary: {
      total: 2,
      passed: 1,
      passRate: 0.5,
      byField: {
        type: { total: 2, passed: 2 },
        amount: { total: 2, passed: 2 },
        currency: { total: 2, passed: 2 },
        category: { total: 2, passed: 1 },
        date: { total: 2, passed: 2 },
      },
      byJudge: {
        description: { total: 2, passed: 1 },
        uncertainty: { total: 2, passed: 2 },
      },
      byLocale: { en: { total: 1, passed: 1 }, uk: { total: 1, passed: 0 } },
    },
    cases: [
      {
        id: 'en-ok',
        locale: 'en',
        pass: true,
        fields: [{ field: 'category', pass: true, expected: 'grocery', actual: 'grocery' }],
        judge: {
          description: { pass: true, reason: 'looks good' },
          uncertainty: { pass: true, reason: 'fine' },
        },
      },
      {
        id: 'uk-bad',
        locale: 'uk',
        pass: false,
        fields: [{ field: 'category', pass: false, expected: 'eating-out', actual: 'grocery' }],
        judge: {
          description: { pass: false, reason: 'echoed the category name' },
          uncertainty: { pass: true, reason: 'ok' },
        },
      },
    ],
    ...over,
  };
}

// 'uk-bad' is intentionally absent to exercise the "dataset changed" fallback.
function caseMap(message = 'spent 500 on groceries'): Map<string, EvalCase> {
  return new Map<string, EvalCase>([
    [
      'en-ok',
      { id: 'en-ok', locale: 'en', message, today: '2026-06-15', expected: EMPTY_EXPECTED },
    ],
  ]);
}

describe('escapeHtml', () => {
  it('escapes HTML-significant characters', () => {
    assert.equal(
      escapeHtml('<a href="x">&\'</a>'),
      '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;',
    );
  });
});

describe('buildRunHtml', () => {
  it('shows the joined message and marks a failing field as a miss', () => {
    const html = buildRunHtml(artifact(), caseMap());
    assert.match(html, /spent 500 on groceries/);
    assert.match(html, /<tr class="miss">/);
    assert.match(html, /eating-out/);
  });

  it('shows both judge reasons', () => {
    const html = buildRunHtml(artifact(), caseMap());
    assert.match(html, /echoed the category name/);
    assert.match(html, /looks good/);
  });

  it('renders a fallback when the case id is not in the dataset', () => {
    const html = buildRunHtml(artifact(), caseMap());
    assert.match(html, /input unavailable/);
  });

  it('escapes message content so it cannot inject markup', () => {
    const html = buildRunHtml(artifact(), caseMap('<script>alert(1)</script>'));
    assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.doesNotMatch(html, /<script>alert/);
  });
});

describe('buildIndexHtml', () => {
  it('lists runs newest-first with links and pass ratios', () => {
    const older: RunLink = {
      artifact: artifact({ generatedAt: '2026-07-13T11:00:00.000Z' }),
      href: 'a.html',
    };
    const newer: RunLink = {
      artifact: artifact({ generatedAt: '2026-07-13T12:00:00.000Z' }),
      href: 'b.html',
    };
    const html = buildIndexHtml([older, newer]);

    assert.match(html, /href="a\.html"/);
    assert.match(html, /href="b\.html"/);
    // Newest (b.html, 12:00) must appear before older (a.html, 11:00).
    assert.ok(html.indexOf('b.html') < html.indexOf('a.html'));
    assert.match(html, /1\/2/); // overall passed/total
  });

  it('renders an empty-state message with no runs', () => {
    assert.match(buildIndexHtml([]), /No runs found/);
  });
});
