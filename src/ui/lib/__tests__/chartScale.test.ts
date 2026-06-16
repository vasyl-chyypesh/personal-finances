import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { niceScale, tickIndices, nearestIndex, monthStartIndices } from '../chartScale.ts';

describe('niceScale', () => {
  it('produces round, evenly spaced ticks covering the range', () => {
    const { niceMin, niceMax, step, ticks } = niceScale(41.2, 44.8, 5);
    assert.ok(niceMin <= 41.2, 'min covers the data');
    assert.ok(niceMax >= 44.8, 'max covers the data');
    ticks.reduce((prev, tick) => {
      assert.ok(Math.abs(tick - prev - step) < step * 1e-6, 'uniform step');
      return tick;
    });
    assert.equal(ticks[0], niceMin);
    assert.equal(ticks.at(-1), niceMax);
  });

  it('avoids floating-point noise in tick labels', () => {
    const { ticks } = niceScale(0, 1, 5);
    for (const t of ticks) {
      assert.equal(t, Number(t.toFixed(4)), `${t} is clean`);
    }
  });

  it('opens a band around a flat series', () => {
    const { niceMin, niceMax } = niceScale(42, 42, 5);
    assert.ok(niceMin < 42 && niceMax > 42, 'flat value gets padding');
  });
});

describe('tickIndices', () => {
  it('includes both ends and never exceeds the length', () => {
    assert.deepEqual(tickIndices(10, 5), [0, 2, 5, 7, 9]);
    assert.deepEqual(tickIndices(1, 5), [0]);
    assert.deepEqual(tickIndices(0, 5), []);
    assert.deepEqual(tickIndices(3, 5), [0, 1, 2]);
  });
});

describe('monthStartIndices', () => {
  it('returns the first index of each distinct YYYY-MM', () => {
    const dates = ['2026-02-16', '2026-02-28', '2026-03-01', '2026-03-15', '2026-04-02'];
    assert.deepEqual(monthStartIndices(dates), [0, 2, 4]);
  });

  it('handles empty and single-month input', () => {
    assert.deepEqual(monthStartIndices([]), []);
    assert.deepEqual(monthStartIndices(['2026-06-01', '2026-06-02']), [0]);
  });
});

describe('nearestIndex', () => {
  it('maps a width fraction to the closest point and clamps', () => {
    assert.equal(nearestIndex(0, 5), 0);
    assert.equal(nearestIndex(1, 5), 4);
    assert.equal(nearestIndex(0.5, 5), 2);
    assert.equal(nearestIndex(-0.3, 5), 0);
    assert.equal(nearestIndex(2, 5), 4);
    assert.equal(nearestIndex(0.5, 1), 0);
  });
});
