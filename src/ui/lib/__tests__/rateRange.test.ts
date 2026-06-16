import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { presetRange } from '../rateRange.ts';

const NOW = new Date('2026-06-15T00:00:00Z');

describe('presetRange', () => {
  it('ends every range at today (UTC)', () => {
    for (const p of ['1m', '3m', '6m', 'ytd', '1y'] as const) {
      assert.equal(presetRange(p, NOW).to, '2026-06-15');
    }
  });

  it('YTD starts on Jan 1 of the current year', () => {
    assert.equal(presetRange('ytd', NOW).from, '2026-01-01');
  });

  it('rolling presets subtract whole months', () => {
    assert.equal(presetRange('1m', NOW).from, '2026-05-15');
    assert.equal(presetRange('3m', NOW).from, '2026-03-15');
    assert.equal(presetRange('6m', NOW).from, '2025-12-15');
    assert.equal(presetRange('1y', NOW).from, '2025-06-15');
  });
});
