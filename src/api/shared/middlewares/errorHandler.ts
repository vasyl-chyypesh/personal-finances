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

  return response.status(500).json({
    code: CODES.INTERNAL_ERROR,
    message: MESSAGES.INTERNAL_SERVER_ERROR,
  });
}
