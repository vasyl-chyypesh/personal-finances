import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type Database from 'better-sqlite3';
import { ImportService } from '../importService.js';
import type { ParsedSheet } from '../xlsParser.js';
import type { ICategoriesRepository } from '../../api/categories/categories.repository.js';
import type { ILedgerRepository } from '../../api/ledger/ledger.repository.js';
import type { Category } from '../../api/categories/categories.types.js';
import type { CreateLedgerEntryDto, LedgerEntry } from '../../api/ledger/ledger.types.js';

// A transaction stub that simply runs the function synchronously, like better-sqlite3.
const fakeDb = {
  transaction: (fn: () => void) => fn,
} as unknown as Database.Database;

function makeCategoriesRepo(existing: Category[] = []): {
  repo: ICategoriesRepository;
  created: string[];
} {
  const created: string[] = [];
  let nextId = existing.length + 1;
  const repo: ICategoriesRepository = {
    findAll: () => existing,
    findById: () => undefined,
    findByName: (name) => existing.find((c) => c.name === name),
    create: (name) => {
      created.push(name);
      const category = { id: nextId++, name };
      existing.push(category);
      return category;
    },
  };
  return { repo, created };
}

function makeLedgerRepo(): {
  repo: ILedgerRepository;
  inserts: CreateLedgerEntryDto[];
  deleteRange: string[];
} {
  const inserts: CreateLedgerEntryDto[] = [];
  const deleteRange: string[] = [];
  const repo: ILedgerRepository = {
    create: (dto) => {
      inserts.push(dto);
      return { id: inserts.length } as LedgerEntry;
    },
    findById: () => undefined,
    findByDateRange: () => [],
    update: () => ({}) as LedgerEntry,
    deleteById: () => false,
    deleteByDateRange: (start, end) => {
      deleteRange.push(start, end);
      return 3;
    },
  };
  return { repo, inserts, deleteRange };
}

const sheet: ParsedSheet = {
  month: 4,
  year: 2026,
  rows: [
    { type: 'expense', category: 'Благодійність', day: 1, amount: 800, description: 'army' },
    { type: 'expense', category: 'Благодійність', day: 3, amount: 100, description: null },
    { type: 'income', category: 'Зарплата', day: 1, amount: 267325.695, description: 'salary' },
  ],
};

describe('ImportService', () => {
  it('wipes the whole month before inserting', () => {
    const cats = makeCategoriesRepo();
    const ledger = makeLedgerRepo();
    new ImportService(fakeDb, ledger.repo, cats.repo).import(sheet);

    assert.deepEqual(ledger.deleteRange, ['2026-04-01', '2026-04-30']);
  });

  it('creates each missing category once and reuses it across rows', () => {
    const cats = makeCategoriesRepo();
    const ledger = makeLedgerRepo();
    const summary = new ImportService(fakeDb, ledger.repo, cats.repo).import(sheet);

    assert.deepEqual(cats.created, ['Благодійність', 'Зарплата']);
    assert.equal(summary.categoriesCreated, 2);
  });

  it('does not recreate categories that already exist', () => {
    const cats = makeCategoriesRepo([{ id: 1, name: 'Благодійність' }]);
    const ledger = makeLedgerRepo();
    const summary = new ImportService(fakeDb, ledger.repo, cats.repo).import(sheet);

    assert.deepEqual(cats.created, ['Зарплата']);
    assert.equal(summary.categoriesCreated, 1);
  });

  it('inserts one UAH entry per row with formatted dates and preserved description', () => {
    const cats = makeCategoriesRepo();
    const ledger = makeLedgerRepo();
    new ImportService(fakeDb, ledger.repo, cats.repo).import(sheet);

    assert.equal(ledger.inserts.length, 3);
    assert.ok(ledger.inserts.every((dto) => dto.currency === 'UAH'));
    assert.deepEqual(
      ledger.inserts.map((dto) => dto.date),
      ['2026-04-01', '2026-04-03', '2026-04-01'],
    );
    assert.equal(ledger.inserts[0].description, 'army');
    assert.equal(ledger.inserts[1].description, undefined);
  });

  it('returns an accurate summary', () => {
    const cats = makeCategoriesRepo();
    const ledger = makeLedgerRepo();
    const summary = new ImportService(fakeDb, ledger.repo, cats.repo).import(sheet);

    assert.deepEqual(summary, {
      month: '2026-04',
      categoriesCreated: 2,
      entriesDeleted: 3,
      entriesInserted: 3,
    });
  });
});
