import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import request from 'supertest';
import type { Express } from 'express';

// Disable the model so the route never downloads/loads a real GGUF — the chat
// HTTP surface (status, validation, unavailable) is exercised model-free, the
// same way RATES_OFFLINE keeps the exchange-rates HTTP tests network-free. Full
// extraction logic is covered by the service unit tests.
process.env['CHAT_MODEL_URI'] = '';

const ROUTES_TEST_DB = './chat-routes-test.db';
process.env['DB_PATH'] = ROUTES_TEST_DB;

describe('Chat routes (HTTP integration)', () => {
  let app: Express;

  before(async () => {
    const { default: importedApp } = await import('../../app.js');
    app = importedApp;
  });

  after(async () => {
    await Promise.all([
      rm(ROUTES_TEST_DB, { force: true }),
      rm(`${ROUTES_TEST_DB}-wal`, { force: true }),
      rm(`${ROUTES_TEST_DB}-shm`, { force: true }),
    ]);
  });

  it('GET /status reports the feature as unavailable when no model is configured', async () => {
    const res = await request(app).get('/api/chat/status');
    assert.equal(res.status, 200);
    const body = res.body as { available: boolean; ready: boolean };
    assert.equal(body.available, false);
    assert.equal(typeof body.ready, 'boolean');
  });

  it('POST /extract returns 503 when the feature is unavailable', async () => {
    const res = await request(app).post('/api/chat/extract').send({ message: 'spent 500 on food' });
    assert.equal(res.status, 503);
    assert.equal((res.body as { code: string }).code, 'CHAT_UNAVAILABLE');
  });

  it('POST /extract returns 400 for an empty message', async () => {
    const res = await request(app).post('/api/chat/extract').send({ message: '   ' });
    assert.equal(res.status, 400);
  });

  it('POST /extract returns 400 when the body is missing message', async () => {
    const res = await request(app).post('/api/chat/extract').send({});
    assert.equal(res.status, 400);
  });
});
