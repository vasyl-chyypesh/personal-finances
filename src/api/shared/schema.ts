import type Database from 'better-sqlite3';

const PREDEFINED_CATEGORIES = [
  'grocery',
  'eating out',
  'sport',
  'medicine',
  'charity',
  'utilities',
  'main work',
  'side project',
  'deposits',
];

export function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT    NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS ledger_entries (
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
}

export function seedCategories(db: Database.Database): void {
  const insert = db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)');
  for (const name of PREDEFINED_CATEGORIES) {
    insert.run(name);
  }
}

export function initDb(db: Database.Database): void {
  initSchema(db);
  seedCategories(db);
}
