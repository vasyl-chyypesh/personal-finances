import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { gradeFields, type GradedExtraction } from '../fieldGrader.js';
import type { ChatExtractResult } from '../../../api/chat/chat.types.js';

function side(
  draft: Partial<ChatExtractResult['draft']>,
  slug: string | null,
  unresolvedCategory = slug == null,
): GradedExtraction {
  return {
    norm: {
      draft: {
        type: 'expense',
        amount: 1250,
        currency: 'UAH',
        categoryId: 1,
        date: '2026-06-15',
        ...draft,
      },
      uncertainFields: [],
      unresolvedCategory,
    },
    slug,
  };
}

describe('gradeFields', () => {
  it('passes every field when both sides match', () => {
    const grades = gradeFields(side({}, 'grocery'), side({}, 'grocery'));
    assert.deepEqual(
      grades.map((g) => g.field),
      ['type', 'amount', 'currency', 'category', 'date'],
    );
    assert.ok(grades.every((g) => g.pass));
  });

  it('fails type, amount, currency and date on mismatch', () => {
    const expected = side(
      { type: 'income', amount: 5000, currency: 'USD', date: '2026-06-14' },
      'salary',
    );
    const actual = side(
      { type: 'expense', amount: 1250, currency: 'UAH', date: '2026-06-15' },
      'salary',
    );
    const byField = Object.fromEntries(gradeFields(expected, actual).map((g) => [g.field, g.pass]));

    assert.equal(byField['type'], false);
    assert.equal(byField['amount'], false);
    assert.equal(byField['currency'], false);
    assert.equal(byField['date'], false);
    assert.equal(byField['category'], true);
  });

  it('compares category on the raw slug and shows "none" for an absent category', () => {
    const grades = gradeFields(side({ categoryId: null }, null), side({}, 'grocery'));
    const category = grades.find((g) => g.field === 'category');

    assert.equal(category?.pass, false);
    assert.equal(category?.expected, 'none');
    assert.equal(category?.actual, 'grocery');
  });

  it('treats two absent categories as a match', () => {
    const category = gradeFields(
      side({ categoryId: null }, null),
      side({ categoryId: null }, null),
    ).find((g) => g.field === 'category');
    assert.equal(category?.pass, true);
    assert.equal(category?.expected, 'none');
  });
});
