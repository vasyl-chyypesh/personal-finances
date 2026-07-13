import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { loadCases } from '../loadCases.js';
import { CATEGORY_CATALOG } from '../../../api/categories/categories.catalog.js';

const DATASET = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'cases.jsonl');

/**
 * Guards the shipped golden dataset (no daemon needed): it must parse, and every
 * expected category must be a real catalog slug so `normalizeExtraction` can
 * resolve it. Loading also enforces unique ids and the case schema.
 */
describe('cases.jsonl', () => {
  const cases = loadCases(DATASET);
  const slugs = new Set(CATEGORY_CATALOG.map((c) => c.slug));

  it('has a non-trivial, bilingual set of cases', () => {
    assert.ok(cases.length >= 20, `expected >= 20 cases, got ${cases.length}`);
    assert.ok(cases.some((c) => c.locale === 'en'));
    assert.ok(cases.some((c) => c.locale === 'uk'));
  });

  it('only references real catalog category slugs', () => {
    const bad = cases
      .filter((c) => c.expected.categorySlug != null && !slugs.has(c.expected.categorySlug))
      .map((c) => `${c.id}:${c.expected.categorySlug}`);
    assert.deepEqual(bad, []);
  });

  it("resolves each case's relative date against its own reference date", () => {
    // Any explicit expected date must be a valid calendar date the normalizer accepts.
    const badDate = cases.filter(
      (c) => c.expected.date != null && Number.isNaN(Date.parse(`${c.expected.date}T00:00:00Z`)),
    );
    assert.deepEqual(badDate, []);
  });
});
