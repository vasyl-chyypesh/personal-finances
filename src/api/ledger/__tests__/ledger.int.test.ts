import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import Database from 'better-sqlite3';
import express from 'express';
import { rm } from 'node:fs/promises';
import { LedgerRepository } from '../ledger.repository.js';
import { LedgerService } from '../ledger.service.js';
import { CategoriesRepository } from '../../categories/categories.repository.js';
import { createLedgerRouter } from '../ledger.routes.js';
import { errorHandler } from '../../shared/middlewares/errorHandler.js';
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
    await rm('./ledger-test.db', { force: true });
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
    const created = repo.create({ type: 'expense', amount: 50, currency: 'UAH', categoryId, date: '2026-06-05' });
    await new Promise((r) => setTimeout(r, 5));
    const updated = repo.update(created.id, { amount: 75, description: 'updated note' });
    assert.equal(updated.amount, 75);
    assert.equal(updated.description, 'updated note');
    assert.equal(updated.type, 'expense');
    assert.ok(updated.updatedAt > created.updatedAt, 'updatedAt should advance');
  });

  it('deleteById removes the entry and returns true', () => {
    const entry = repo.create({ type: 'income', amount: 5000, currency: 'UAH', categoryId, date: '2026-06-20' });
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

describe('Ledger routes (HTTP integration)', () => {
  let db: Database.Database;
  let server: http.Server;
  let baseUrl: string;
  let validCategoryId: number;

  before(async () => {
    db = new Database('./ledger-routes-test.db');
    db.pragma('foreign_keys = ON');
    initDb(db);

    const catRepo = new CategoriesRepository(db);
    const ledgerRepo = new LedgerRepository(db);
    const service = new LedgerService(ledgerRepo, catRepo);
    validCategoryId = catRepo.findAll()[0].id;

    const app = express();
    app.use(express.json());
    app.use('/api/ledger', createLedgerRouter(service));
    app.use(errorHandler);

    await new Promise<void>((resolve) => {
      server = app.listen(0, resolve);
    });
    const addr = server.address() as { port: number };
    baseUrl = `http://localhost:${addr.port}/api/ledger`;
  });

  after(async () => {
    await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
    db.close();
    await rm('./ledger-routes-test.db', { force: true });
  });

  it('POST / creates an entry and returns 201', async () => {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'expense', amount: 99, currency: 'UAH', categoryId: validCategoryId, date: '2026-06-01' }),
    });
    assert.equal(res.status, 201);
    const body = await res.json() as LedgerEntry;
    assert.equal(body.type, 'expense');
    assert.equal(body.amount, 99);
    assert.ok(typeof body.id === 'number');
    assert.ok(body.createdAt.includes('T'));
  });

  it('POST / returns 400 for invalid body', async () => {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'expense' }),
    });
    assert.equal(res.status, 400);
  });

  it('POST / returns 400 for unknown categoryId', async () => {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'expense', amount: 10, currency: 'UAH', categoryId: 99999, date: '2026-06-01' }),
    });
    assert.equal(res.status, 400);
  });

  it('GET /?period=month returns records and date range', async () => {
    const res = await fetch(`${baseUrl}?period=month`);
    assert.equal(res.status, 200);
    const body = await res.json() as { records: LedgerEntry[]; period: string; startDate: string; endDate: string };
    assert.equal(body.period, 'month');
    assert.ok(typeof body.startDate === 'string');
    assert.ok(typeof body.endDate === 'string');
    assert.ok(Array.isArray(body.records));
  });

  it('GET / defaults period to month when omitted', async () => {
    const res = await fetch(baseUrl);
    assert.equal(res.status, 200);
    const body = await res.json() as { period: string };
    assert.equal(body.period, 'month');
  });

  it('PUT /:id updates the entry', async () => {
    const createRes = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'expense', amount: 50, currency: 'UAH', categoryId: validCategoryId, date: '2026-06-15' }),
    });
    const created = await createRes.json() as LedgerEntry;

    const res = await fetch(`${baseUrl}/${created.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ amount: 75 }),
    });
    assert.equal(res.status, 200);
    const updated = await res.json() as LedgerEntry;
    assert.equal(updated.amount, 75);
    assert.equal(updated.id, created.id);
  });

  it('PUT /:id returns 404 for unknown entry', async () => {
    const res = await fetch(`${baseUrl}/99999`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ amount: 10 }),
    });
    assert.equal(res.status, 404);
  });

  it('PUT /:id returns 400 for empty body', async () => {
    const createRes = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'income', amount: 1000, currency: 'USD', categoryId: validCategoryId, date: '2026-06-01' }),
    });
    const created = await createRes.json() as LedgerEntry;

    const res = await fetch(`${baseUrl}/${created.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
  });

  it('DELETE /:id removes the entry and returns 204', async () => {
    const createRes = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'income', amount: 500, currency: 'UAH', categoryId: validCategoryId, date: '2026-06-01' }),
    });
    const created = await createRes.json() as LedgerEntry;

    const deleteRes = await fetch(`${baseUrl}/${created.id}`, { method: 'DELETE' });
    assert.equal(deleteRes.status, 204);

    const getRes = await fetch(`${baseUrl}/${created.id}`);
    assert.equal(getRes.status, 404);
  });

  it('DELETE /:id returns 404 for unknown entry', async () => {
    const res = await fetch(`${baseUrl}/99999`, { method: 'DELETE' });
    assert.equal(res.status, 404);
  });
});
