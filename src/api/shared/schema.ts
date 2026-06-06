import type Database from 'better-sqlite3';
import { CATEGORY_CATALOG } from '../categories/categories.catalog.js';
import { DEFAULT_EXCHANGE_RATES } from '../exchange-rates/exchangeRates.catalog.js';

export function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      slug       TEXT    NOT NULL UNIQUE,
      names      TEXT    NOT NULL,
      deleted_at TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS ledger_entries (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      type        TEXT    NOT NULL CHECK(type IN ('income', 'expense')),
      amount      INTEGER NOT NULL CHECK(amount > 0),
      currency    TEXT    NOT NULL CHECK(currency IN ('UAH', 'USD', 'EUR')),
      category_id INTEGER NOT NULL REFERENCES categories(id),
      description TEXT,
      date        TEXT    NOT NULL,
      created_at  TEXT    NOT NULL,
      updated_at  TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS exchange_rates (
      from_currency TEXT NOT NULL CHECK(from_currency IN ('UAH', 'USD', 'EUR')),
      to_currency   TEXT NOT NULL CHECK(to_currency IN ('UAH', 'USD', 'EUR')),
      rate          REAL NOT NULL CHECK(rate > 0),
      PRIMARY KEY (from_currency, to_currency)
    );
  `);
}

/** Adds columns introduced after the initial schema to pre-existing DB files. */
export function migrateSchema(db: Database.Database): void {
  const columns = db.prepare('PRAGMA table_info(categories)').all() as { name: string }[];
  if (!columns.some((c) => c.name === 'deleted_at')) {
    db.exec('ALTER TABLE categories ADD COLUMN deleted_at TEXT');
  }
  if (!columns.some((c) => c.name === 'sort_order')) {
    db.exec('ALTER TABLE categories ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0');
    backfillSortOrder(db);
  }
}

/** Assigns a sequential sort_order to all existing categories: catalog order first, then by slug. */
function backfillSortOrder(db: Database.Database): void {
  const catalogIndex = new Map(CATEGORY_CATALOG.map((c, i) => [c.slug, i]));
  const rows = db.prepare('SELECT id, slug FROM categories').all() as {
    id: number;
    slug: string;
  }[];
  rows.sort((a, b) => {
    const ai = catalogIndex.get(a.slug) ?? CATEGORY_CATALOG.length;
    const bi = catalogIndex.get(b.slug) ?? CATEGORY_CATALOG.length;
    return ai - bi || a.slug.localeCompare(b.slug);
  });
  const update = db.prepare('UPDATE categories SET sort_order = ? WHERE id = ?');
  db.transaction(() => {
    rows.forEach((row, index) => update.run(index, row.id));
  })();
}

export function seedCategories(db: Database.Database): void {
  const insert = db.prepare(
    'INSERT OR IGNORE INTO categories (slug, names, sort_order) VALUES (?, ?, ?)',
  );
  CATEGORY_CATALOG.forEach(({ slug, names }, index) => {
    insert.run(slug, JSON.stringify(names), index);
  });
}

/** Seeds the predefined conversion matrix only when no rates are stored yet. */
export function seedExchangeRates(db: Database.Database): void {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM exchange_rates').get() as { n: number };
  if (n > 0) return;

  const insert = db.prepare(
    'INSERT INTO exchange_rates (from_currency, to_currency, rate) VALUES (?, ?, ?)',
  );
  for (const [from, row] of Object.entries(DEFAULT_EXCHANGE_RATES)) {
    for (const [to, rate] of Object.entries(row)) {
      insert.run(from, to, rate);
    }
  }
}

export function initDb(db: Database.Database): void {
  initSchema(db);
  migrateSchema(db);
  seedCategories(db);
  seedExchangeRates(db);
}
