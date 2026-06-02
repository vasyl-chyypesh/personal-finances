import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { rm } from 'node:fs/promises';
import type { Express } from 'express';
import request from 'supertest';
import { CategoriesRepository } from '../categories.repository.js';
import { CategoriesService } from '../categories.service.js';
import { initDb } from '../../shared/schema.js';
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
    assert.deepEqual(found, { id: created.id, slug: 'custom-test', names: { uk: 'Тест' } });
  });

  it('updateNames merges translations', () => {
    const created = repo.create('merge-test', { uk: 'Лише укр' });
    const updated = repo.updateNames(created.id, { ...created.names, en: 'English now' });
    assert.deepEqual(updated.names, { uk: 'Лише укр', en: 'English now' });
  });

  it('findById returns undefined for unknown id', () => {
    assert.equal(repo.findById(99999), undefined);
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
});
