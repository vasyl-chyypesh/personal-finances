import { NextFunction, Request, Response } from 'express';
import { Logger } from '../logger.js';

export function requestLogger(request: Request, response: Response, next: NextFunction) {
  const start = process.hrtime.bigint();

  response.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const { statusCode } = response;
    const line = `${request.method} ${request.originalUrl} ${statusCode} ${durationMs.toFixed(1)}ms`;

    if (statusCode >= 500) {
      Logger.error(line);
    } else {
      Logger.log(line);
    }
  });

  next();
}
