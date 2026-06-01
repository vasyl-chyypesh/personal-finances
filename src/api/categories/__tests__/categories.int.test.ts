import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { rm } from 'node:fs/promises';
import { CategoriesRepository } from '../categories.repository.js';
import { CategoriesService } from '../categories.service.js';
import { initDb } from '../../shared/schema.js';

const TEST_DB_PATH = './categories-test.db';

describe('CategoriesRepository (integration)', () => {
  let db: Database.Database;
  let service: CategoriesService;

  before(() => {
    db = new Database(TEST_DB_PATH);
    db.pragma('foreign_keys = ON');
    initDb(db);
    service = new CategoriesService(new CategoriesRepository(db));
  });

  after(async () => {
    db.close();
    await rm(TEST_DB_PATH, { force: true });
  });

  it('returns all 9 predefined categories', () => {
    const categories = service.list();
    assert.equal(categories.length, 9);
  });

  it('each category has a numeric id and string name', () => {
    const categories = service.list();
    for (const cat of categories) {
      assert.ok(typeof cat.id === 'number', 'id must be a number');
      assert.ok(typeof cat.name === 'string', 'name must be a string');
      assert.ok(cat.name.length > 0, 'name must not be empty');
    }
  });

  it('includes expected category names', () => {
    const names = service.list().map((c) => c.name);
    const expected = ['grocery', 'eating out', 'sport', 'medicine', 'charity', 'utilities', 'main work', 'side project', 'deposits'];
    for (const name of expected) {
      assert.ok(names.includes(name), `expected category "${name}" to be present`);
    }
  });

  it('findById returns category by id', () => {
    const [first] = service.list();
    const repo = new CategoriesRepository(db);
    const found = repo.findById(first.id);
    assert.deepEqual(found, first);
  });

  it('findById returns undefined for unknown id', () => {
    const repo = new CategoriesRepository(db);
    assert.equal(repo.findById(99999), undefined);
  });
});
