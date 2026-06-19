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
import { writeFixtureXls, writeMultiSheetFixtureXls } from './fixture.js';

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
    return new ImportService(db, ledgerRepo, categoriesRepo).import(parseXls(FIXTURE).sheets[0]);
  }

  it('persists ledger entries and auto-creates categories', () => {
    const summary = runImport();
    assert.equal(summary.entriesInserted, 4);

    const entries = ledgerRepo.findByDateRange('2026-04-01', '2026-04-30');
    assert.equal(entries.length, 4);

    // 800 in the sheet is stored as 80000 integer minor units (cents)
    const charity = entries.find((e) => e.category.slug === 'charity' && e.amount === 80000);
    assert.ok(charity);
    assert.equal(charity.type, 'expense');
    assert.equal(charity.currency, 'UAH');
    assert.equal(charity.date, '2026-04-01');
    assert.equal(charity.description, 'army');
    // mapped onto the seeded catalog entry, so it is bilingual
    assert.equal(charity.category.names.en, 'Charity');
    assert.equal(charity.category.names.uk, 'Благодійність');

    // sub-row "-електроенергія" normalized to "Електроенергія" and mapped to the
    // catalog "electricity" slug (seeded, bilingual)
    const electricity = categoriesRepo.findBySlug('electricity');
    assert.equal(electricity?.names.uk, 'Електроенергія');

    // "Зарплата" maps to the seeded catalog "salary" slug (bilingual)
    const salary = entries.find((e) => e.category.slug === 'salary');
    assert.equal(salary?.type, 'income');
    assert.equal(salary?.amount, 26732570); // 267325.695 * 100, rounded
    assert.deepEqual(salary?.category.names, { en: 'Salary', uk: 'Зарплата' });
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

describe('xls import (integration) — multiple sheets', () => {
  const MULTI_DB = './import-int-multi-test.db';
  const MULTI_FIXTURE = join(tmpdir(), `import-int-multi-${process.pid}.xls`);
  let db: Database.Database;

  before(() => {
    writeMultiSheetFixtureXls(MULTI_FIXTURE);
    db = new Database(MULTI_DB);
    db.pragma('foreign_keys = ON');
    initDb(db);
  });

  after(async () => {
    db.close();
    await Promise.all([
      rm(MULTI_DB, { force: true }),
      rm(`${MULTI_DB}-wal`, { force: true }),
      rm(`${MULTI_DB}-shm`, { force: true }),
      rm(MULTI_FIXTURE, { force: true }),
    ]);
  });

  it('imports each budget sheet into its own month and skips non-budget tabs', () => {
    const ledgerRepo = new LedgerRepository(db);
    const service = new ImportService(db, ledgerRepo, new CategoriesRepository(db));

    const { sheets, skipped } = parseXls(MULTI_FIXTURE);
    assert.deepEqual(skipped, ['Notes']);
    const summaries = sheets.map((sheet) => service.import(sheet));

    assert.deepEqual(
      summaries.map((s) => [s.month, s.entriesInserted]),
      [
        ['2026-04', 4],
        ['2026-05', 2],
      ],
    );

    assert.equal(ledgerRepo.findByDateRange('2026-04-01', '2026-04-30').length, 4);
    assert.equal(ledgerRepo.findByDateRange('2026-05-01', '2026-05-31').length, 2);
  });
});
