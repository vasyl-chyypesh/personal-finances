import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseCases } from '../loadCases.js';

const VALID =
  '{"id":"en-1","locale":"en","message":"spent 500 on groceries","today":"2026-06-15","expected":{"type":"expense","amountMajor":500,"currency":null,"categorySlug":"grocery","description":null,"date":null}}';

describe('parseCases', () => {
  it('parses valid JSONL and ignores blank lines', () => {
    const cases = parseCases(`\n${VALID}\n\n`);
    assert.equal(cases.length, 1);
    assert.equal(cases[0].id, 'en-1');
    assert.equal(cases[0].expected.amountMajor, 500);
  });

  it('reports the line number on invalid JSON', () => {
    assert.throws(() => parseCases(`${VALID}\nnot json`), /line 2: not valid JSON/);
  });

  it('rejects a case that violates the schema', () => {
    const bad = VALID.replace('"locale":"en"', '"locale":"fr"');
    assert.throws(() => parseCases(bad), /line 1:/);
  });

  it('rejects a malformed date', () => {
    const bad = VALID.replace('"today":"2026-06-15"', '"today":"June 15"');
    assert.throws(() => parseCases(bad), /line 1:/);
  });

  it('rejects duplicate ids', () => {
    assert.throws(() => parseCases(`${VALID}\n${VALID}`), /duplicate case id "en-1"/);
  });
});
