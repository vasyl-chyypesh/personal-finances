import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { rm } from 'node:fs/promises';
import type { Express } from 'express';
import request from 'supertest';
import { CategoriesRepository } from '../categories.repository.js';
import { CategoriesService } from '../categories.service.js';
import { initDb, migrateSchema } from '../../shared/schema.js';
import { CATEGORY_CATALOG } from '../categories.catalog.js';
import type { Category } from '../categories.types.js';

const TEST_DB_PATH = './categories-test.db';

describe('CategoriesRepository (integration)', () => {
  let db: Database.Database;
  let service: CategoriesService;
  let repo: CategoriesRepository;

  before(() => {
    db = new Database(TEST_DB_PATH);
    db.pragma('foreign_keys = ON');
    initDb(db);
    repo = new CategoriesRepository(db);
    service = new CategoriesService(repo);
  });

  after(async () => {
    db.close();
    await Promise.all([
      rm(TEST_DB_PATH, { force: true }),
      rm(`${TEST_DB_PATH}-wal`, { force: true }),
      rm(`${TEST_DB_PATH}-shm`, { force: true }),
    ]);
  });

  it('seeds the full catalog', () => {
    assert.equal(service.list().length, CATEGORY_CATALOG.length);
  });

  it('each category has an id, slug, and bilingual names', () => {
    for (const cat of service.list()) {
      assert.ok(typeof cat.id === 'number', 'id must be a number');
      assert.ok(cat.slug.length > 0, 'slug must not be empty');
      assert.ok(cat.names.en && cat.names.en.length > 0, 'en name present');
      assert.ok(cat.names.uk && cat.names.uk.length > 0, 'uk name present');
    }
  });

  it('findBySlug resolves a seeded category', () => {
    const charity = repo.findBySlug('charity');
    assert.equal(charity?.names.en, 'Charity');
    assert.equal(charity?.names.uk, 'Благодійність');
  });

  it('create inserts a category with a JSON names blob', () => {
    const created = repo.create('custom-test', { uk: 'Тест' });
    const found = repo.findById(created.id);
    assert.deepEqual(found, {
      id: created.id,
      slug: 'custom-test',
      names: { uk: 'Тест' },
      deletedAt: null,
      sortOrder: found?.sortOrder,
    });
    assert.equal(typeof found?.sortOrder, 'number');
  });

  it('updateNames merges translations', () => {
    const created = repo.create('merge-test', { uk: 'Лише укр' });
    const updated = repo.updateNames(created.id, { ...created.names, en: 'English now' });
    assert.deepEqual(updated.names, { uk: 'Лише укр', en: 'English now' });
  });

  it('findById returns undefined for unknown id', () => {
    assert.equal(repo.findById(99999), undefined);
  });

  it('seeds categories in catalog order', () => {
    const list = service.list();
    assert.equal(list[0].slug, CATEGORY_CATALOG[0].slug);
    assert.equal(list[1].slug, CATEGORY_CATALOG[1].slug);
  });

  it('create appends a category with the highest sort_order', () => {
    const before = service.list();
    const maxOrder = Math.max(...before.map((c) => c.sortOrder ?? 0));
    const created = service.create({ en: 'Appended last' });
    assert.equal(created.sortOrder, maxOrder + 1);
    assert.equal(service.list().at(-1)?.id, created.id);
  });

  it('reorder rewrites sort_order to match the given id sequence', () => {
    const list = service.list();
    const reversed = [...list].reverse().map((c) => c.id);
    service.reorder(reversed);
    assert.deepEqual(
      service.list().map((c) => c.id),
      reversed,
    );
  });

  it('softDelete hides a category from the default list but restore brings it back', () => {
    const created = service.create({ en: 'Soft delete me' });
    service.remove(created.id);
    assert.ok(!service.list().some((c) => c.id === created.id), 'hidden by default');
    assert.ok(
      service.list(true).some((c) => c.id === created.id),
      'included when includeDeleted',
    );
    service.restore(created.id);
    assert.ok(
      service.list().some((c) => c.id === created.id),
      'visible again after restore',
    );
  });
});

const ROUTES_TEST_DB = './categories-routes-test.db';
process.env['DB_PATH'] = ROUTES_TEST_DB;

describe('Categories routes (HTTP integration)', () => {
  let app: Express;
  let seededId: number;

  before(async () => {
    const { default: importedApp } = await import('../../app.js');
    app = importedApp;
    const db = new Database(ROUTES_TEST_DB);
    seededId = new CategoriesRepository(db).findBySlug('charity')!.id;
    db.close();
  });

  after(async () => {
    await Promise.all([
      rm(ROUTES_TEST_DB, { force: true }),
      rm(`${ROUTES_TEST_DB}-wal`, { force: true }),
      rm(`${ROUTES_TEST_DB}-shm`, { force: true }),
    ]);
  });

  it('GET / returns categories with slug and names', async () => {
    const res = await request(app).get('/api/categories');
    assert.equal(res.status, 200);
    const body = res.body as Category[];
    const charity = body.find((c) => c.slug === 'charity');
    assert.equal(charity?.names.uk, 'Благодійність');
  });

  it('PATCH /:id merges a translation', async () => {
    const res = await request(app)
      .patch(`/api/categories/${seededId}`)
      .send({ names: { en: 'Donations' } });
    assert.equal(res.status, 200);
    const body = res.body as Category;
    assert.equal(body.names.en, 'Donations');
    assert.equal(body.names.uk, 'Благодійність', 'existing locale preserved');
  });

  it('PATCH /:id returns 404 for unknown category', async () => {
    const res = await request(app)
      .patch('/api/categories/99999')
      .send({ names: { en: 'x' } });
    assert.equal(res.status, 404);
  });

  it('PATCH /:id returns 400 when no locale provided', async () => {
    const res = await request(app).patch(`/api/categories/${seededId}`).send({ names: {} });
    assert.equal(res.status, 400);
  });

  it('POST / creates a category with an auto-derived slug', async () => {
    const res = await request(app)
      .post('/api/categories')
      .send({ names: { en: 'Coffee Beans', uk: 'Кавові зерна' } });
    assert.equal(res.status, 201);
    const body = res.body as Category;
    assert.equal(body.slug, 'coffee-beans');
    assert.equal(body.names.en, 'Coffee Beans');
  });

  it('POST / returns 409 for a duplicate slug', async () => {
    const res = await request(app)
      .post('/api/categories')
      .send({ names: { en: 'Coffee Beans' } });
    assert.equal(res.status, 409);
    assert.equal((res.body as { code: string }).code, 'CATEGORY_SLUG_CONFLICT');
  });

  it('POST / returns 400 when no locale provided', async () => {
    const res = await request(app).post('/api/categories').send({ names: {} });
    assert.equal(res.status, 400);
  });

  it('POST / returns 400 when the name has no sluggable characters', async () => {
    const res = await request(app)
      .post('/api/categories')
      .send({ names: { en: '💰' } });
    assert.equal(res.status, 400);
    assert.equal((res.body as { code: string }).code, 'CATEGORY_INVALID_NAME');
  });

  it('DELETE /:id soft-deletes, hiding it from the default list', async () => {
    const created = (
      await request(app)
        .post('/api/categories')
        .send({ names: { en: 'To be removed' } })
    ).body as Category;

    const del = await request(app).delete(`/api/categories/${created.id}`);
    assert.equal(del.status, 204);

    const list = (await request(app).get('/api/categories')).body as Category[];
    assert.ok(!list.some((c) => c.id === created.id), 'hidden by default');

    const withDeleted = (await request(app).get('/api/categories?includeDeleted=true'))
      .body as Category[];
    assert.ok(
      withDeleted.some((c) => c.id === created.id),
      'shown with includeDeleted',
    );

    const restored = await request(app).post(`/api/categories/${created.id}/restore`);
    assert.equal(restored.status, 200);
    const after = (await request(app).get('/api/categories')).body as Category[];
    assert.ok(
      after.some((c) => c.id === created.id),
      'visible again after restore',
    );
  });

  it('DELETE /:id returns 404 for unknown category', async () => {
    const res = await request(app).delete('/api/categories/99999');
    assert.equal(res.status, 404);
  });

  it('POST /:id/restore returns 404 for unknown category', async () => {
    const res = await request(app).post('/api/categories/99999/restore');
    assert.equal(res.status, 404);
  });

  it('PUT /order reorders categories and GET reflects the new order', async () => {
    const list = (await request(app).get('/api/categories')).body as Category[];
    const reversed = [...list].reverse().map((c) => c.id);

    const res = await request(app).put('/api/categories/order').send({ ids: reversed });
    assert.equal(res.status, 204);

    const after = (await request(app).get('/api/categories')).body as Category[];
    assert.deepEqual(
      after.map((c) => c.id),
      reversed,
    );
  });

  it('PUT /order returns 400 for an empty id list', async () => {
    const res = await request(app).put('/api/categories/order').send({ ids: [] });
    assert.equal(res.status, 400);
  });
});

const MIGRATE_TEST_DB = './categories-migrate-test.db';

describe('migrateSchema (sort_order backfill)', () => {
  let db: Database.Database;

  before(() => {
    db = new Database(MIGRATE_TEST_DB);
    // Simulate a pre-sort_order schema and insert rows out of catalog order.
    db.exec(`
      CREATE TABLE categories (
        id    INTEGER PRIMARY KEY AUTOINCREMENT,
        slug  TEXT    NOT NULL UNIQUE,
        names TEXT    NOT NULL
      );
    `);
    const insert = db.prepare('INSERT INTO categories (slug, names) VALUES (?, ?)');
    // catalog index: charity=0, alcohol-tobacco=1; custom slug is unknown → goes last
    insert.run('custom-zzz', JSON.stringify({ en: 'Custom' }));
    insert.run('alcohol-tobacco', JSON.stringify({ en: 'Alcohol' }));
    insert.run('charity', JSON.stringify({ en: 'Charity' }));
  });

  after(async () => {
    db.close();
    await Promise.all([
      rm(MIGRATE_TEST_DB, { force: true }),
      rm(`${MIGRATE_TEST_DB}-wal`, { force: true }),
      rm(`${MIGRATE_TEST_DB}-shm`, { force: true }),
    ]);
  });

  it('backfills sort_order in catalog order, with unknown slugs last', () => {
    migrateSchema(db);
    const rows = new CategoriesRepository(db).findAll();
    assert.deepEqual(
      rows.map((c) => c.slug),
      ['charity', 'alcohol-tobacco', 'custom-zzz'],
    );
    assert.deepEqual(
      rows.map((c) => c.sortOrder),
      [0, 1, 2],
    );
  });
});
