import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MINOR_UNIT_SCALE, centsToMajor, majorToCents } from '../money.ts';

describe('money', () => {
  it('uses a scale of 100', () => {
    assert.equal(MINOR_UNIT_SCALE, 100);
  });

  it('centsToMajor divides by 100', () => {
    assert.equal(centsToMajor(15050), 150.5);
    assert.equal(centsToMajor(0), 0);
    assert.equal(centsToMajor(1), 0.01);
  });

  it('majorToCents multiplies by 100 and rounds to the nearest cent', () => {
    assert.equal(majorToCents(150.5), 15050);
    assert.equal(majorToCents(0.01), 1);
    assert.equal(majorToCents(99.999), 10000); // sub-cent rounds up
    assert.equal(majorToCents(99.994), 9999); // sub-cent rounds down
  });

  it('round-trips integer-cent values exactly', () => {
    for (const cents of [0, 1, 99, 15050, 26732570]) {
      assert.equal(majorToCents(centsToMajor(cents)), cents);
    }
  });
});
