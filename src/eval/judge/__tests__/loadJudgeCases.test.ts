import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { loadJudgeCases, parseJudgeCases } from '../loadJudgeCases.js';

const DATASET = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'judgeCases.jsonl');

const VALID =
  '{"id":"m1","input":{"message":"coffee at Aroma Kava for 85","expectedDescription":"Aroma Kava","actualDescription":"Aroma Kava","flaggedByModel":[]},"expect":{"description":"pass","uncertainty":"pass"}}';

describe('parseJudgeCases', () => {
  it('parses a valid meta-case', () => {
    const cases = parseJudgeCases(VALID);
    assert.equal(cases.length, 1);
    assert.equal(cases[0].expect.description, 'pass');
    assert.deepEqual(cases[0].input.flaggedByModel, []);
  });

  it('reports the line number on invalid JSON', () => {
    assert.throws(() => parseJudgeCases(`${VALID}\noops`), /line 2: not valid JSON/);
  });

  it('rejects an invalid expect verdict', () => {
    const bad = VALID.replace('"description":"pass"', '"description":"maybe"');
    assert.throws(() => parseJudgeCases(bad), /line 1:/);
  });

  it('rejects duplicate ids', () => {
    assert.throws(() => parseJudgeCases(`${VALID}\n${VALID}`), /duplicate case id "m1"/);
  });
});

describe('judgeCases.jsonl', () => {
  it('is a non-trivial dataset covering both pass and fail labels', () => {
    const cases = loadJudgeCases(DATASET);
    assert.ok(cases.length >= 6, `expected >= 6 meta-cases, got ${cases.length}`);
    const verdicts = cases.flatMap((c) => [c.expect.description, c.expect.uncertainty]);
    assert.ok(verdicts.includes('pass'), 'dataset should include pass labels');
    assert.ok(verdicts.includes('fail'), 'dataset should include fail labels');
  });
});
