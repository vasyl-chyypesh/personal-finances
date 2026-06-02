import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rm } from 'node:fs/promises';
import { initDb } from '../../api/shared/schema.js';
import { CategoriesRepository } from '../../api/categories/categories.repository.js';
import { LedgerRepository } from '../../api/ledger/ledger.repository.js';
import { parseXls } from '../xlsParser.js';
import { ImportService } from '../importService.js';
import { writeFixtureXls } from './fixture.js';

const TEST_DB = './import-int-test.db';
const FIXTURE = join(tmpdir(), `import-int-${process.pid}.xls`);

describe('xls import (integration)', () => {
  let db: Database.Database;
  let ledgerRepo: LedgerRepository;
  let categoriesRepo: CategoriesRepository;

  before(() => {
    writeFixtureXls(FIXTURE);
    db = new Database(TEST_DB);
    db.pragma('foreign_keys = ON');
    initDb(db);
    ledgerRepo = new LedgerRepository(db);
    categoriesRepo = new CategoriesRepository(db);
  });

  after(async () => {
    db.close();
    await Promise.all([
      rm(TEST_DB, { force: true }),
      rm(`${TEST_DB}-wal`, { force: true }),
      rm(`${TEST_DB}-shm`, { force: true }),
      rm(FIXTURE, { force: true }),
    ]);
  });

  function runImport() {
    return new ImportService(db, ledgerRepo, categoriesRepo).import(parseXls(FIXTURE));
  }

  it('persists ledger entries and auto-creates categories', () => {
    const summary = runImport();
    assert.equal(summary.entriesInserted, 4);

    const entries = ledgerRepo.findByDateRange('2026-04-01', '2026-04-30');
    assert.equal(entries.length, 4);

    const charity = entries.find((e) => e.category.name === 'Благодійність' && e.amount === 800);
    assert.ok(charity);
    assert.equal(charity.type, 'expense');
    assert.equal(charity.currency, 'UAH');
    assert.equal(charity.date, '2026-04-01');
    assert.equal(charity.description, 'army');

    // sub-row "-електроенергія" was normalized to a flat, capitalized category
    assert.ok(categoriesRepo.findByName('Електроенергія'));

    const salary = entries.find((e) => e.category.name === 'Зарплата');
    assert.equal(salary?.type, 'income');
    assert.equal(salary?.amount, 267325.695);
  });

  it('is idempotent per month — re-running replaces rather than duplicates', () => {
    const summary = runImport();
    assert.equal(summary.entriesDeleted, 4, 'second run wipes the 4 rows from the first run');
    assert.equal(summary.entriesInserted, 4);
    assert.equal(summary.categoriesCreated, 0, 'categories already exist on the second run');

    const entries = ledgerRepo.findByDateRange('2026-04-01', '2026-04-30');
    assert.equal(entries.length, 4, 'no duplication after a second import');
  });
});
