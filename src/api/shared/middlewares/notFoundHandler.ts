import { Request, Response } from 'express';
import { CODES } from '../errors/codes.js';
import { MESSAGES } from '../errors/messages.js';

export function notFoundHandler(_request: Request, response: Response) {
  return response.status(404).json({ code: CODES.NOT_FOUND, message: MESSAGES.PAGE_NOT_FOUND });
}
