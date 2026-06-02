import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rm } from 'node:fs/promises';
import { parseXls, type ParsedRow } from '../xlsParser.js';
import { writeFixtureXls } from './fixture.js';

const FIXTURE = join(tmpdir(), `import-parser-${process.pid}.xls`);

function find(rows: ParsedRow[], category: string, day: number): ParsedRow | undefined {
  return rows.find((r) => r.category === category && r.day === day);
}

describe('parseXls', () => {
  let month: number;
  let year: number;
  let rows: ParsedRow[];

  before(() => {
    writeFixtureXls(FIXTURE);
    ({ month, year, rows } = parseXls(FIXTURE));
  });

  after(async () => {
    await rm(FIXTURE, { force: true });
  });

  it('parses month and year from the Ukrainian sheet title', () => {
    assert.equal(month, 4);
    assert.equal(year, 2026);
  });

  it('emits one row per non-empty day cell, skipping totals and percent columns', () => {
    // Благодійність(2) + електроенергія(1) + Зарплата(1) = 4
    assert.equal(rows.length, 4);
  });

  it('classifies rows by section into expense and income', () => {
    assert.equal(find(rows, 'Благодійність', 1)?.type, 'expense');
    assert.equal(find(rows, 'Зарплата', 1)?.type, 'income');
  });

  it('strips a leading non-letter prefix and capitalizes the category label', () => {
    assert.ok(
      find(rows, 'Електроенергія', 2),
      'sub-row "-електроенергія" becomes "Електроенергія"',
    );
    assert.equal(find(rows, 'Електроенергія', 2)?.amount, 250.5);
  });

  it('maps the cell comment into the description and trims it', () => {
    assert.equal(find(rows, 'Благодійність', 1)?.description, 'army');
    assert.equal(find(rows, 'Електроенергія', 2)?.description, 'April bill');
    assert.equal(find(rows, 'Зарплата', 1)?.description, 'salary');
  });

  it('leaves description null when a cell has no comment', () => {
    assert.equal(find(rows, 'Благодійність', 3)?.description, null);
  });

  it('skips rows whose cells are all empty or zero', () => {
    assert.ok(!rows.some((r) => r.category === 'Порожня'));
  });
});
