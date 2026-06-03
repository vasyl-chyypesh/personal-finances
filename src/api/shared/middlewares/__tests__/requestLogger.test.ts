import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import type { Request, Response, NextFunction } from 'express';
import { Logger } from '../../logger.js';
import { requestLogger } from '../requestLogger.js';

function makeRequest(method: string, originalUrl: string): Request {
  return { method, originalUrl } as Request;
}

function makeResponse(statusCode: number): Response & EventEmitter {
  const response = new EventEmitter() as Response & EventEmitter;
  response.statusCode = statusCode;
  return response;
}

describe('requestLogger', () => {
  let logSpy: ReturnType<typeof mock.method>;
  let errorSpy: ReturnType<typeof mock.method>;

  beforeEach(() => {
    logSpy = mock.method(Logger, 'log', () => {});
    errorSpy = mock.method(Logger, 'error', () => {});
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it('calls next immediately without logging', () => {
    const next = mock.fn<NextFunction>();
    requestLogger(makeRequest('GET', '/api/ledger'), makeResponse(200), next);

    assert.equal(next.mock.callCount(), 1);
    assert.equal(logSpy.mock.callCount(), 0);
    assert.equal(errorSpy.mock.callCount(), 0);
  });

  it('logs method, url and status on finish', () => {
    const response = makeResponse(200);
    requestLogger(makeRequest('GET', '/api/ledger'), response, mock.fn());

    response.emit('finish');

    assert.equal(logSpy.mock.callCount(), 1);
    const line = logSpy.mock.calls[0]?.arguments[0] as string;
    assert.match(line, /^GET \/api\/ledger 200 [\d.]+ms$/);
    assert.equal(errorSpy.mock.callCount(), 0);
  });

  it('escalates 5xx responses to Logger.error', () => {
    const response = makeResponse(500);
    requestLogger(makeRequest('POST', '/api/ledger'), response, mock.fn());

    response.emit('finish');

    assert.equal(errorSpy.mock.callCount(), 1);
    assert.equal(logSpy.mock.callCount(), 0);
    const line = errorSpy.mock.calls[0]?.arguments[0] as string;
    assert.match(line, /^POST \/api\/ledger 500 [\d.]+ms$/);
  });

  it('keeps 4xx responses at Logger.log', () => {
    const response = makeResponse(404);
    requestLogger(makeRequest('GET', '/missing'), response, mock.fn());

    response.emit('finish');

    assert.equal(logSpy.mock.callCount(), 1);
    assert.equal(errorSpy.mock.callCount(), 0);
  });
});
