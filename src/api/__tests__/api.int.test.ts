import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { notFoundHandler } from '../shared/middlewares/notFoundHandler.js';
import { errorHandler } from '../shared/middlewares/errorHandler.js';

describe('API (integration)', () => {
  let server: http.Server;
  let baseUrl: string;

  before(async () => {
    const app = express();
    app.use(express.json());

    app.get('/health', (_req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    app.use(notFoundHandler);
    app.use(errorHandler);

    await new Promise<void>((resolve) => {
      server = app.listen(0, resolve);
    });
    const addr = server.address() as { port: number };
    baseUrl = `http://localhost:${addr.port}`;
  });

  after(async () => {
    await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
  });

  describe('GET /health', () => {
    it('returns 200 with status ok', async () => {
      const res = await fetch(`${baseUrl}/health`);
      assert.equal(res.status, 200);
      const body = await res.json() as { status: string; timestamp: string };
      assert.equal(body.status, 'ok');
    });

    it('includes an ISO 8601 timestamp', async () => {
      const res = await fetch(`${baseUrl}/health`);
      const body = await res.json() as { timestamp: string };
      assert.ok(typeof body.timestamp === 'string', 'timestamp must be a string');
      assert.ok(!Number.isNaN(Date.parse(body.timestamp)), 'timestamp must be a valid date');
      assert.ok(body.timestamp.includes('T'), 'timestamp must be ISO 8601 format');
    });
  });

  describe('unknown routes', () => {
    it('returns 404 for an unknown path', async () => {
      const res = await fetch(`${baseUrl}/does-not-exist`);
      assert.equal(res.status, 404);
    });

    it('returns a JSON body with a message field', async () => {
      const res = await fetch(`${baseUrl}/does-not-exist`);
      const body = await res.json() as { message: string };
      assert.ok(typeof body.message === 'string');
      assert.ok(body.message.length > 0);
    });

    it('returns 404 for nested unknown paths', async () => {
      const res = await fetch(`${baseUrl}/api/unknown/route`);
      assert.equal(res.status, 404);
    });
  });
});
