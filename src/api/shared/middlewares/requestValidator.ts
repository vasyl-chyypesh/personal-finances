import type { ZodSchema } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { HttpError } from '../errors/httpError.js';
import { CODES } from '../errors/codes.js';

export enum RequestSource {
  body = 'body',
  query = 'query',
  params = 'params',
}

export function requestValidator<T>(
  schema: ZodSchema<T>,
  source: RequestSource = RequestSource.body,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    // eslint-disable-next-line security/detect-object-injection
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(
        new HttpError(
          result.error.issues[0]?.message ?? 'Validation error',
          CODES.BAD_REQUEST,
          400,
        ),
      );
    }
    // eslint-disable-next-line security/detect-object-injection
    res.locals[source] = result.data;
    return next();
  };
}
