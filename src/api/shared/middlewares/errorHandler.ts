import { NextFunction, Request, Response } from 'express';
import { HttpError } from '../errors/httpError.js';
import { CODES } from '../errors/codes.js';
import { MESSAGES } from '../errors/messages.js';
import { Logger } from '../logger.js';

// `next` is required so Express treats this as error-handling middleware (arity 4).
export function errorHandler(
  error: Error,
  request: Request,
  response: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
) {
  Logger.error(error);

  if (error instanceof HttpError) {
    return response.status(error.httpStatus).json({
      code: error.code,
      message: error.message,
    });
  }

  // Body-parser (express.json) raises http-errors instances carrying a numeric
  // `status`/`statusCode` and a `type`. Translate the common client-side ones
  // into our `{ code, message }` shape instead of masking them as a 500.
  const bodyError = error as { type?: string; status?: number; statusCode?: number };
  const status = bodyError.status ?? bodyError.statusCode;

  if (bodyError.type === 'entity.too.large') {
    return response.status(413).json({
      code: CODES.PAYLOAD_TOO_LARGE,
      message: MESSAGES.PAYLOAD_TOO_LARGE,
    });
  }

  if (typeof status === 'number' && status >= 400 && status < 500) {
    return response.status(400).json({
      code: CODES.BAD_REQUEST,
      message: MESSAGES.MALFORMED_BODY,
    });
  }

  return response.status(500).json({
    code: CODES.INTERNAL_ERROR,
    message: MESSAGES.INTERNAL_SERVER_ERROR,
  });
}
