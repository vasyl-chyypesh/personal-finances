import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import request from 'supertest';
import type { Express } from 'express';

const API_TEST_DB = './api-test.db';
process.env['DB_PATH'] = API_TEST_DB;

describe('API (integration)', () => {
  let app: Express;

  before(async () => {
    const { default: importedApp } = await import('../app.js');
    app = importedApp;
  });

  after(async () => {
    await Promise.all([
      rm(API_TEST_DB, { force: true }),
      rm(`${API_TEST_DB}-wal`, { force: true }),
      rm(`${API_TEST_DB}-shm`, { force: true }),
    ]);
  });

  describe('GET /health', () => {
    it('returns 200 with status ok', async () => {
      const res = await request(app).get('/health');
      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'ok');
    });

    it('includes an ISO 8601 timestamp', async () => {
      const res = await request(app).get('/health');
      assert.ok(typeof res.body.timestamp === 'string', 'timestamp must be a string');
      assert.ok(!Number.isNaN(Date.parse(res.body.timestamp)), 'timestamp must be a valid date');
      assert.ok((res.body.timestamp as string).includes('T'), 'timestamp must be ISO 8601 format');
    });
  });

  describe('unknown routes', () => {
    it('returns 404 for an unknown path', async () => {
      const res = await request(app).get('/does-not-exist');
      assert.equal(res.status, 404);
    });

    it('returns a JSON body with a code and message field', async () => {
      const res = await request(app).get('/does-not-exist');
      assert.equal(res.body.code, 'NOT_FOUND');
      assert.ok(typeof res.body.message === 'string');
      assert.ok(res.body.message.length > 0);
    });

    it('returns 404 for nested unknown paths', async () => {
      const res = await request(app).get('/api/unknown/route');
      assert.equal(res.status, 404);
    });
  });

  describe('request hardening', () => {
    it('rejects a JSON body larger than the 100kb limit with 413', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ names: { en: 'a'.repeat(200 * 1024) } }));
      assert.equal(res.status, 413);
    });

    it('rejects an id param beyond the safe-integer range with 400', async () => {
      const res = await request(app).delete('/api/ledger/99999999999999999999');
      assert.equal(res.status, 400);
      assert.equal(res.body.code, 'BAD_REQUEST');
    });
  });
});
