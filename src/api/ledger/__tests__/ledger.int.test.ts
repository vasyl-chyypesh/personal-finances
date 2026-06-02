import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { rm } from 'node:fs/promises';
import request from 'supertest';
import type { Express } from 'express';
import { LedgerRepository } from '../ledger.repository.js';
import { CategoriesRepository } from '../../categories/categories.repository.js';
import { initDb } from '../../shared/schema.js';
import type { LedgerEntry, CreateLedgerEntryDto } from '../ledger.types.js';

// ---------------------------------------------------------------------------
// LedgerRepository integration tests
// ---------------------------------------------------------------------------

describe('LedgerRepository (integration)', () => {
  let db: Database.Database;
  let repo: LedgerRepository;
  let catRepo: CategoriesRepository;
  let categoryId: number;

  before(() => {
    db = new Database('./ledger-test.db');
    db.pragma('foreign_keys = ON');
    initDb(db);
    catRepo = new CategoriesRepository(db);
    repo = new LedgerRepository(db);
    categoryId = catRepo.findAll()[0].id;
  });

  after(async () => {
    db.close();
    await Promise.all([
      rm('./ledger-test.db', { force: true }),
      rm('./ledger-test.db-wal', { force: true }),
      rm('./ledger-test.db-shm', { force: true }),
    ]);
  });

  it('create inserts and returns a full entry with category', () => {
    const dto: CreateLedgerEntryDto = {
      type: 'expense',
      amount: 150.5,
      currency: 'UAH',
      categoryId,
      description: 'supermarket run',
      date: '2026-06-01',
    };
    const entry = repo.create(dto);
    assert.equal(entry.type, 'expense');
    assert.equal(entry.amount, 150.5);
    assert.equal(entry.currency, 'UAH');
    assert.equal(entry.category.id, categoryId);
    assert.equal(entry.description, 'supermarket run');
    assert.equal(entry.date, '2026-06-01');
    assert.ok(entry.createdAt.includes('T'), 'createdAt should be ISO 8601');
    assert.ok(entry.updatedAt.includes('T'), 'updatedAt should be ISO 8601');
    assert.ok(typeof entry.id === 'number' && entry.id > 0);
  });

  it('findById returns undefined for unknown id', () => {
    assert.equal(repo.findById(99999), undefined);
  });

  it('findByDateRange returns entries within range', () => {
    repo.create({ type: 'income', amount: 1000, currency: 'USD', categoryId, date: '2026-05-15' });
    repo.create({ type: 'expense', amount: 200, currency: 'EUR', categoryId, date: '2026-06-10' });

    const juneEntries = repo.findByDateRange('2026-06-01', '2026-06-30');
    assert.ok(juneEntries.every((e) => e.date >= '2026-06-01' && e.date <= '2026-06-30'));

    const mayEntries = repo.findByDateRange('2026-05-01', '2026-05-31');
    assert.ok(mayEntries.some((e) => e.date === '2026-05-15'));
  });

  it('update modifies only provided fields and bumps updatedAt', async () => {
    const created = repo.create({
      type: 'expense',
      amount: 50,
      currency: 'UAH',
      categoryId,
      date: '2026-06-05',
    });
    await new Promise((r) => setTimeout(r, 5));
    const updated = repo.update(created.id, { amount: 75, description: 'updated note' });
    assert.equal(updated.amount, 75);
    assert.equal(updated.description, 'updated note');
    assert.equal(updated.type, 'expense');
    assert.ok(updated.updatedAt > created.updatedAt, 'updatedAt should advance');
  });

  it('deleteById removes the entry and returns true', () => {
    const entry = repo.create({
      type: 'income',
      amount: 5000,
      currency: 'UAH',
      categoryId,
      date: '2026-06-20',
    });
    const deleted = repo.deleteById(entry.id);
    assert.ok(deleted);
    assert.equal(repo.findById(entry.id), undefined);
  });

  it('deleteById returns false for non-existent entry', () => {
    assert.equal(repo.deleteById(99999), false);
  });
});

// ---------------------------------------------------------------------------
// Ledger routes HTTP integration tests
// ---------------------------------------------------------------------------

const ROUTES_TEST_DB = './ledger-routes-test.db';
process.env['DB_PATH'] = ROUTES_TEST_DB;

describe('Ledger routes (HTTP integration)', () => {
  let app: Express;
  let validCategoryId: number;

  before(async () => {
    const { default: importedApp } = await import('../../app.js');
    app = importedApp;

    const db = new Database(ROUTES_TEST_DB);
    db.pragma('foreign_keys = ON');
    validCategoryId = new CategoriesRepository(db).findAll()[0].id;
    db.close();
  });

  after(async () => {
    await Promise.all([
      rm(ROUTES_TEST_DB, { force: true }),
      rm(`${ROUTES_TEST_DB}-wal`, { force: true }),
      rm(`${ROUTES_TEST_DB}-shm`, { force: true }),
    ]);
  });

  it('POST / creates an entry and returns 201', async () => {
    const res = await request(app).post('/api/ledger').send({
      type: 'expense',
      amount: 99,
      currency: 'UAH',
      categoryId: validCategoryId,
      date: '2026-06-01',
    });
    assert.equal(res.status, 201);
    const body = res.body as LedgerEntry;
    assert.equal(body.type, 'expense');
    assert.equal(body.amount, 99);
    assert.ok(typeof body.id === 'number');
    assert.ok(body.createdAt.includes('T'));
  });

  it('POST / returns 400 for invalid body', async () => {
    const res = await request(app).post('/api/ledger').send({ type: 'expense' });
    assert.equal(res.status, 400);
  });

  it('POST / returns 400 for unknown categoryId', async () => {
    const res = await request(app).post('/api/ledger').send({
      type: 'expense',
      amount: 10,
      currency: 'UAH',
      categoryId: 99999,
      date: '2026-06-01',
    });
    assert.equal(res.status, 400);
  });

  it('GET /?period=month returns records and date range', async () => {
    const res = await request(app).get('/api/ledger?period=month');
    assert.equal(res.status, 200);
    const body = res.body as {
      records: LedgerEntry[];
      period: string;
      startDate: string;
      endDate: string;
    };
    assert.equal(body.period, 'month');
    assert.ok(typeof body.startDate === 'string');
    assert.ok(typeof body.endDate === 'string');
    assert.ok(Array.isArray(body.records));
  });

  it('GET / defaults period to month when omitted', async () => {
    const res = await request(app).get('/api/ledger');
    assert.equal(res.status, 200);
    assert.equal((res.body as { period: string }).period, 'month');
  });

  it('GET /?period=month&year=2026&month=4 scopes to that explicit month', async () => {
    const inApril = (
      await request(app).post('/api/ledger').send({
        type: 'expense',
        amount: 321,
        currency: 'UAH',
        categoryId: validCategoryId,
        date: '2026-04-15',
      })
    ).body as LedgerEntry;

    const res = await request(app).get('/api/ledger?period=month&year=2026&month=4');
    assert.equal(res.status, 200);
    const body = res.body as { records: LedgerEntry[]; startDate: string; endDate: string };
    assert.equal(body.startDate, '2026-04-01');
    assert.equal(body.endDate, '2026-04-30');
    assert.ok(body.records.some((e) => e.id === inApril.id));
    assert.ok(body.records.every((e) => e.date >= '2026-04-01' && e.date <= '2026-04-30'));
  });

  it('PUT /:id updates the entry', async () => {
    const created = (
      await request(app).post('/api/ledger').send({
        type: 'expense',
        amount: 50,
        currency: 'UAH',
        categoryId: validCategoryId,
        date: '2026-06-15',
      })
    ).body as LedgerEntry;

    const res = await request(app).put(`/api/ledger/${created.id}`).send({ amount: 75 });
    assert.equal(res.status, 200);
    const updated = res.body as LedgerEntry;
    assert.equal(updated.amount, 75);
    assert.equal(updated.id, created.id);
  });

  it('PUT /:id returns 404 for unknown entry', async () => {
    const res = await request(app).put('/api/ledger/99999').send({ amount: 10 });
    assert.equal(res.status, 404);
  });

  it('PUT /:id returns 400 for empty body', async () => {
    const created = (
      await request(app).post('/api/ledger').send({
        type: 'income',
        amount: 1000,
        currency: 'USD',
        categoryId: validCategoryId,
        date: '2026-06-01',
      })
    ).body as LedgerEntry;

    const res = await request(app).put(`/api/ledger/${created.id}`).send({});
    assert.equal(res.status, 400);
  });

  it('DELETE /:id removes the entry and returns 204', async () => {
    const created = (
      await request(app).post('/api/ledger').send({
        type: 'income',
        amount: 500,
        currency: 'UAH',
        categoryId: validCategoryId,
        date: '2026-06-01',
      })
    ).body as LedgerEntry;

    assert.equal((await request(app).delete(`/api/ledger/${created.id}`)).status, 204);
    assert.equal((await request(app).get(`/api/ledger/${created.id}`)).status, 404);
  });

  it('DELETE /:id returns 404 for unknown entry', async () => {
    const res = await request(app).delete('/api/ledger/99999');
    assert.equal(res.status, 404);
  });
});
