import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { rm } from 'node:fs/promises';
import { migrateAmountToCents } from '../schema.js';

const TEST_DB = './schema-migrate-test.db';

/** Builds a legacy DB: ledger_entries with a floating-point REAL amount column. */
function seedLegacyDb(db: Database.Database): void {
  db.exec(`
    CREATE TABLE categories (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT    NOT NULL UNIQUE,
      names TEXT   NOT NULL
    );
    CREATE TABLE ledger_entries (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      type        TEXT    NOT NULL CHECK(type IN ('income', 'expense')),
      amount      REAL    NOT NULL CHECK(amount > 0),
      currency    TEXT    NOT NULL CHECK(currency IN ('UAH', 'USD', 'EUR')),
      category_id INTEGER NOT NULL REFERENCES categories(id),
      description TEXT,
      date        TEXT    NOT NULL,
      created_at  TEXT    NOT NULL,
      updated_at  TEXT    NOT NULL
    );
  `);
  db.prepare("INSERT INTO categories (slug, names) VALUES ('grocery', '{}')").run();
  const insert = db.prepare(
    `INSERT INTO ledger_entries (type, amount, currency, category_id, date, created_at, updated_at)
     VALUES (?, ?, 'UAH', 1, '2026-06-01', '', '')`,
  );
  insert.run('expense', 150.5);
  insert.run('income', 1000);
}

describe('migrateAmountToCents (integration)', () => {
  let db: Database.Database;

  before(() => {
    db = new Database(TEST_DB);
    db.pragma('foreign_keys = ON');
    seedLegacyDb(db);
  });

  after(async () => {
    db.close();
    await Promise.all([
      rm(TEST_DB, { force: true }),
      rm(`${TEST_DB}-wal`, { force: true }),
      rm(`${TEST_DB}-shm`, { force: true }),
    ]);
  });

  it('converts existing REAL amounts to integer cents and bumps user_version', () => {
    migrateAmountToCents(db);

    const rows = db.prepare('SELECT amount FROM ledger_entries ORDER BY id').all() as {
      amount: number;
    }[];
    assert.deepEqual(
      rows.map((r) => r.amount),
      [15050, 100000], // 150.50 and 1000.00 in cents
    );
    assert.ok(
      rows.every((r) => Number.isInteger(r.amount)),
      'all amounts are integers',
    );

    const col = (db.pragma('table_info(ledger_entries)') as { name: string; type: string }[]).find(
      (c) => c.name === 'amount',
    );
    assert.equal(col?.type, 'INTEGER', 'amount column is rebuilt as INTEGER');
    assert.equal(db.pragma('user_version', { simple: true }), 1);
  });

  it('is idempotent — a second run leaves the cents values untouched', () => {
    migrateAmountToCents(db);

    const rows = db.prepare('SELECT amount FROM ledger_entries ORDER BY id').all() as {
      amount: number;
    }[];
    assert.deepEqual(
      rows.map((r) => r.amount),
      [15050, 100000],
    );
  });
});
